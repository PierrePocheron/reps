import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GymSession from '@/pages/GymSession';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useUserStore } from '@/store/userStore';
import * as gs from '@/firebase/gymSessions';
import type { GymSessionExercise } from '@/firebase/types';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useKeepAwake', () => ({ useKeepAwake: () => {} }));
vi.mock('@/hooks/useHaptic', () => ({ useHaptic: () => ({ impact: vi.fn(), notification: vi.fn() }) }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/utils/restNotification', () => ({ scheduleRestEnd: vi.fn(), cancelRestEnd: vi.fn(), exactAlarmDenied: () => Promise.resolve(false), openExactAlarmSettings: vi.fn() }));
vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), updateUserStatsAfterSession: vi.fn(() => Promise.resolve()) }));
vi.mock('@/firebase/gymSessions', async (orig) => ({ ...(await orig<typeof import('@/firebase/gymSessions')>()), getUserGymSessions: vi.fn() }));

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
});

describe('GymSession — chrono d\'un exercice en durée', () => {
  it('continue de tourner quand on quitte la page puis qu\'on y revient', async () => {
    const plank = { ...bench([{ reps: 30, weight: 0 }]), exerciseId: 'plank', name: 'Gainage', timed: true };
    const view = await setup([plank]);
    fireEvent.click(screen.getByLabelText('Lancer le chrono de la série 1'));
    view.unmount();

    await setup([plank], { chrono: useGymSessionStore.getState().chrono });
    const chrono = screen.getByLabelText('Arrêter le chrono et valider la série 1');
    expect(chrono).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(chrono);
    expect(sets()[0]).toMatchObject({ completed: true, actualReps: 1 });
    expect(useGymSessionStore.getState().chrono).toBeNull();
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

describe('GymSession — repos automatique', () => {
  it('démarre aussi après la seule série (ou la dernière) de la séance, quand on ajoute les séries une à une', async () => {
    await setup([bench([{ reps: 8, weight: 60 }])], { autoRest: true });
    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    expect(useGymSessionStore.getState()).toMatchObject({ showRestTimer: true, restExerciseId: 'bench_press' });
  });
});
