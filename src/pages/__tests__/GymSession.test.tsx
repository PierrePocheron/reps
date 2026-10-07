import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GymSession from '@/pages/GymSession';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useUserStore } from '@/store/userStore';
import * as gs from '@/firebase/gymSessions';
import { shareSessionCard } from '@/utils/shareCard';
import type { GymSessionExercise } from '@/firebase/types';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useKeepAwake', () => ({ useKeepAwake: () => {} }));
vi.mock('@/hooks/useHaptic', () => ({ useHaptic: () => ({ impact: vi.fn(), notification: vi.fn(), selection: vi.fn() }) }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/utils/restNotification', () => ({ scheduleRestEnd: vi.fn(), cancelRestEnd: vi.fn(), exactAlarmDenied: () => Promise.resolve(false), openExactAlarmSettings: vi.fn() }));
vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), updateUserStatsAfterSession: vi.fn(() => Promise.resolve()) }));
vi.mock('@/firebase/gymSessions', async (orig) => ({ ...(await orig<typeof import('@/firebase/gymSessions')>()), getUserGymSessions: vi.fn(), createGymSession: vi.fn(() => Promise.resolve('id')) }));
vi.mock('@/utils/shareCard', async (orig) => ({ ...(await orig<typeof import('@/utils/shareCard')>()), shareSessionCard: vi.fn() }));

const bench = (sets: { reps: number; weight: number; completed?: boolean }[]): GymSessionExercise =>
  ({ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: sets.map((s) => ({ completed: false, ...s })) });

const setup = async (exercises: GymSessionExercise[], extra: Record<string, unknown> = {}) => {
  vi.mocked(gs.getUserGymSessions).mockResolvedValue([]);
  useUserStore.setState({ user: { uid: 'u1', displayName: 'P' } as never });
  useGymSessionStore.setState({
    phase: 'execute', startTime: Date.now(), autoRest: false, showRpe: false, suggestLoad: false, backdate: null,
    showRestTimer: false, restEndsAt: null, exercises, ...extra,
  } as never);
  const view = render(<MemoryRouter><GymSession /></MemoryRouter>);
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); // history loaded
  return view;
};
const sets = () => useGymSessionStore.getState().exercises[0]!.sets;

describe('GymSession — saisie des charges', () => {
  beforeEach(() => toast.mockClear());

  it('accepte la virgule française et l\'affiche (« 82,5 » ne devient pas 825)', async () => {
    await setup([bench([{ reps: 8, weight: 82.5 }])]);
    const weight = screen.getByLabelText('Charge en kg, série 1') as HTMLInputElement;
    expect(weight.value).toBe('82,5');
    expect(weight).toHaveAttribute('inputmode', 'decimal');
    expect(screen.getByLabelText('Répétitions, série 1')).toHaveAttribute('inputmode', 'numeric');

    fireEvent.change(weight, { target: { value: '85,5' } });
    expect(sets()[0]!.actualWeight).toBe(85.5);
    expect(weight.value).toBe('85,5');
    fireEvent.change(weight, { target: { value: '85.5a' } }); // pas un nombre : refusé
    expect(weight.value).toBe('85,5');

    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    expect(sets()[0]).toMatchObject({ completed: true, actualWeight: 85.5, actualReps: 8 });
  });

  it('refuse les répétitions non entières (« 8,5 »)', async () => {
    await setup([bench([{ reps: 8, weight: 60 }])]);
    const reps = screen.getByLabelText('Répétitions, série 1') as HTMLInputElement;
    for (const value of ['8,', '8,5', '8.5']) fireEvent.change(reps, { target: { value } });
    expect(reps.value).toBe('8');
    expect(sets()[0]!.actualReps).toBeUndefined();
    fireEvent.change(reps, { target: { value: '10' } });
    expect(sets()[0]!.actualReps).toBe(10);
  });
});

describe('GymSession — chrono d\'un exercice en durée', () => {
  it('continue de tourner quand on quitte la page puis qu\'on y revient', async () => {
    const plank = { ...bench([{ reps: 30, weight: 0 }]), exerciseId: 'plank', name: 'Gainage', timed: true };
    const view = await setup([plank]);
    fireEvent.click(screen.getByLabelText('Lancer le chrono de la série 1'));
    view.unmount();

    await setup([plank], { chronos: useGymSessionStore.getState().chronos });
    const chrono = screen.getByLabelText('Arrêter le chrono et valider la série 1');
    expect(chrono).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chrono);
    expect(sets()[0]).toMatchObject({ completed: true, actualReps: 1 });
    expect(useGymSessionStore.getState().chronos).toEqual({});
  });

  it('retirer la série chronométrée arrête son chrono : la série ajoutée ensuite repart de zéro', async () => {
    const plank = { ...bench([{ reps: 60, weight: 0, completed: true }, { reps: 60, weight: 0 }]), exerciseId: 'plank', name: 'Gainage', timed: true };
    await setup([plank], { chronos: {} });
    fireEvent.click(screen.getByLabelText('Lancer le chrono de la série 2'));
    fireEvent.click(screen.getByLabelText('Retirer la dernière série'));
    fireEvent.click(screen.getByRole('button', { name: /Série 2/ }));
    expect(screen.getByLabelText('Lancer le chrono de la série 2')).toHaveAttribute('aria-pressed', 'false');
  });

  it('deux exercices en durée se chronomètrent en parallèle', async () => {
    const plank = { ...bench([{ reps: 60, weight: 0 }]), exerciseId: 'plank', name: 'Gainage', timed: true };
    const side = { ...plank, exerciseId: 'side_plank', name: 'Gainage latéral' };
    await setup([plank, side], { chronos: {} });
    const [a, b] = screen.getAllByLabelText('Lancer le chrono de la série 1');
    fireEvent.click(a!);
    fireEvent.click(b!);
    expect(screen.getAllByLabelText('Arrêter le chrono et valider la série 1')).toHaveLength(2);
  });

  it('reste sur la série qu\'il mesure quand une série d\'avant est dé-validée', async () => {
    const plank = { ...bench([{ reps: 60, weight: 0, completed: true }, { reps: 60, weight: 0 }]), exerciseId: 'plank', name: 'Gainage', timed: true };
    await setup([plank], { chronos: {} });
    fireEvent.click(screen.getByLabelText('Lancer le chrono de la série 2'));
    fireEvent.click(screen.getByLabelText('Annuler la validation de la série 1'));
    fireEvent.click(screen.getByLabelText('Arrêter le chrono et valider la série 2'));
    expect(sets().map((s) => s.completed)).toEqual([false, true]);
  });
});

describe('GymSession — séance vide', () => {
  const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

  it('est abandonnée quand on quitte la page (retour, barre de navigation), pas une séance commencée', async () => {
    const view = await setup([]);
    view.unmount();
    await tick();
    expect(useGymSessionStore.getState().phase).toBe('idle');

    const started = await setup([bench([{ reps: 8, weight: 60 }])]);
    started.unmount();
    await tick();
    expect(useGymSessionStore.getState().phase).toBe('execute');
  });

  it('survit au double montage du mode strict de React', async () => {
    vi.mocked(gs.getUserGymSessions).mockResolvedValue([]);
    useGymSessionStore.setState({ phase: 'execute', startTime: Date.now(), exercises: [], showRestTimer: false });
    const view = render(<StrictMode><MemoryRouter><GymSession /></MemoryRouter></StrictMode>);
    await tick();
    expect(useGymSessionStore.getState().phase).toBe('execute');
    view.unmount();
    await tick(); // its deferred discard must not land in the next test
  });

  it('la poubelle l\'annule sans demander de confirmation', async () => {
    await setup([]);
    fireEvent.click(screen.getByLabelText('Annuler la séance'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(useGymSessionStore.getState().phase).toBe('idle');
  });
});

describe('GymSession — série validée par erreur', () => {
  it('retoucher la coche la dé-valide, valeurs gardées, et lui retire son trophée', async () => {
    const history = [{ id: 'old', userId: 'u1', date: { toDate: () => new Date(2026, 9, 1), toMillis: () => 0 }, duration: 3000, totalVolume: 500, totalSets: 1,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ reps: 5, weight: 100, completed: true }] }] }];
    vi.mocked(gs.getUserGymSessions).mockResolvedValue(history as never);
    useUserStore.setState({ user: { uid: 'u1', displayName: 'P' } as never });
    useGymSessionStore.setState({ phase: 'execute', startTime: Date.now(), autoRest: false, showRpe: false, suggestLoad: false, exercises: [bench([{ reps: 5, weight: 110 }])] } as never);
    render(<MemoryRouter><GymSession /></MemoryRouter>);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });

    fireEvent.change(screen.getByLabelText('Répétitions, série 1'), { target: { value: '6' } });
    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    expect(sets()[0]).toMatchObject({ completed: true, isRecord: true });
    fireEvent.click(screen.getByLabelText('Annuler la validation de la série 1'));
    expect(sets()[0]).toMatchObject({ completed: false, isRecord: false, actualReps: 6, actualWeight: 110 });
    expect((screen.getByLabelText('Répétitions, série 1') as HTMLInputElement).value).toBe('6');
  });

  it('avec le RPE, le choix « Annuler la validation » du menu RPE fait de même', async () => {
    await setup([bench([{ reps: 8, weight: 60 }])], { showRpe: true });
    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    fireEvent.change(screen.getByLabelText('RPE (effort ressenti), série 1'), { target: { value: 'undo' } });
    expect(sets()[0]).toMatchObject({ completed: false, actualReps: 8, actualWeight: 60 });
    expect(screen.getByLabelText('Valider la série 1')).toBeInTheDocument();
  });
});

describe('GymSession — retirer pendant la séance', () => {
  it('« − » retire la dernière série tant qu\'elle n\'est pas validée', async () => {
    await setup([bench([{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }])]);
    fireEvent.click(screen.getByLabelText('Retirer la dernière série'));
    expect(sets()).toHaveLength(1);
    expect(screen.queryByLabelText('Retirer la dernière série')).toBeNull(); // never empties the exercise (saved without sets)
    fireEvent.click(screen.getByRole('button', { name: /Série 2/ }));
    fireEvent.click(screen.getByLabelText('Valider la série 2'));
    expect(screen.queryByLabelText('Retirer la dernière série')).toBeNull(); // validée : on ne la perd pas d'un appui
  });

  it('la fiche de l\'exercice permet de le retirer de la séance', async () => {
    await setup([bench([{ reps: 8, weight: 60 }]), { ...bench([{ reps: 10, weight: 20 }]), exerciseId: 'barbell_curl', name: 'Curl barre' }]);
    fireEvent.click(screen.getByLabelText('Développé couché : voir la fiche et ta progression'));
    fireEvent.click(screen.getByRole('button', { name: /Retirer de la séance/ }));
    expect(useGymSessionStore.getState().exercises.map((e) => e.exerciseId)).toEqual(['barbell_curl']);
    expect(screen.queryByRole('button', { name: /Retirer de la séance/ })).toBeNull(); // fiche refermée
  });

  it('demande confirmation avant de retirer un exercice qui a des séries validées', async () => {
    const curl = { ...bench([{ reps: 10, weight: 20 }]), exerciseId: 'barbell_curl', name: 'Curl barre' };
    await setup([bench([{ reps: 8, weight: 60, completed: true }, { reps: 8, weight: 60, completed: true }]), curl]);
    const ids = () => useGymSessionStore.getState().exercises.map((e) => e.exerciseId);
    const remove = () => {
      fireEvent.click(screen.getByLabelText('Développé couché : voir la fiche et ta progression'));
      fireEvent.click(screen.getByRole('button', { name: /Retirer de la séance/ }));
    };

    remove();
    expect(screen.getByRole('dialog', { name: /Retirer Développé couché/ })).toHaveTextContent('2 séries validées');
    expect(ids()).toEqual(['bench_press', 'barbell_curl']);
    fireEvent.click(screen.getByRole('button', { name: 'Garder' }));
    expect(ids()).toEqual(['bench_press', 'barbell_curl']);
    expect(screen.queryByRole('dialog')).toBeNull();

    remove();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(ids()).toEqual(['barbell_curl']);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('GymSession — la prochaine série reste visible au-dessus de la barre de repos', () => {
  const scrolled: string[] = [];
  const frame = () => act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
  beforeEach(async () => {
    await frame(); // a scroll queued by an earlier test's validation must not land here
    scrolled.length = 0;
    Element.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) { scrolled.push(this.dataset.set ?? ''); });
  });

  it('après « Valider », fait défiler jusqu\'à la série suivante à faire', async () => {
    await setup([bench([{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }])]);
    fireEvent.click(screen.getByLabelText('Valider la série 2'));
    await frame();
    expect(scrolled).toEqual(['bench_press:2']);
  });

  it('après l\'ajout d\'un exercice, fait défiler jusqu\'à sa première série', async () => {
    await setup([bench([{ reps: 8, weight: 60 }])]);
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un exercice/ }));
    fireEvent.click(screen.getByRole('button', { name: /Développé incliné/ }));
    await frame();
    expect(scrolled).toEqual(['incline_bench:0']);
  });
});

describe('GymSession — bouton de repos de la barre', () => {
  it('dit aux lecteurs d\'écran qu\'il s\'agit du minuteur de repos', async () => {
    await setup([bench([{ reps: 8, weight: 60 }])], { restDuration: 90 });
    fireEvent.click(screen.getByRole('button', { name: 'Lancer un repos de 1:30' }));
    expect(screen.getByRole('button', { name: 'Arrêter le minuteur de repos' })).toBeInTheDocument();
  });
});

describe('GymSession — textes de progression', () => {
  it('accorde « série validée » avec le total, sans « 0/1 série complétées »', async () => {
    await setup([bench([{ reps: 8, weight: 60 }]), { ...bench([{ reps: 10, weight: 20, completed: true }, { reps: 10, weight: 20, completed: true }, { reps: 10, weight: 20 }]), exerciseId: 'barbell_curl', name: 'Curl barre' }]);
    expect(screen.getByText('0 sur 1 série validée')).toBeInTheDocument();
    expect(screen.getByText('2 sur 3 séries validées')).toBeInTheDocument();
    expect(screen.queryByText(/complétée/)).toBeNull();
    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    fireEvent.click(screen.getAllByLabelText('Valider la série 3')[0]!);
    expect(screen.getByText(/Toutes les séries validées/).textContent).toBe('Toutes les séries validées\u00a0!');
    expect(screen.getByText(/^Terminer/).textContent).toBe('Terminer\u00a0!');
  });
});

describe('GymSession — partage depuis le récap', () => {
  const finish = async () => {
    useUserStore.setState({ currentUser: { uid: 'u1' } as never });
    await setup([bench([{ reps: 8, weight: 60, completed: true }])]);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Terminer/ })); });
    toast.mockClear();
  };

  it('signale un partage impossible, comme l\'historique', async () => {
    await finish();
    vi.mocked(shareSessionCard).mockRejectedValueOnce(new Error('canvas'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Partager ma séance/ })); });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Partage impossible', variant: 'destructive' }));
  });

  it('se tait quand on ferme simplement la feuille de partage', async () => {
    await finish();
    vi.mocked(shareSessionCard).mockResolvedValueOnce(false); // annulé : saveFile résout false
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Partager ma séance/ })); });
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('GymSession — repos automatique', () => {
  it('démarre aussi après la seule série (ou la dernière) de la séance, quand on ajoute les séries une à une', async () => {
    await setup([bench([{ reps: 8, weight: 60 }])], { autoRest: true });
    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    expect(useGymSessionStore.getState()).toMatchObject({ showRestTimer: true, restExerciseId: 'bench_press' });
  });
});
