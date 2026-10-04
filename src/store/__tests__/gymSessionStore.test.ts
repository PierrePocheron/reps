import { describe, it, expect, vi } from 'vitest';
import { useGymSessionStore } from '../gymSessionStore';
import { cancelRestEnd } from '@/utils/restNotification';

vi.mock('@/utils/restNotification', () => ({ scheduleRestEnd: vi.fn(), cancelRestEnd: vi.fn() }));

describe('gymSessionStore — persistance de la séance en cours', () => {
  it('sauvegarde séries et chrono, sans l\'affichage du minuteur de repos', () => {
    useGymSessionStore.setState({
      phase: 'execute',
      startTime: 123,
      showRestTimer: true,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: true }] }],
    });
    const saved = JSON.parse(localStorage.getItem('reps_gym_session') ?? '{}').state;
    expect(saved.phase).toBe('execute');
    expect(saved.startTime).toBe(123);
    expect(saved.exercises[0].sets[0].completed).toBe(true);
    expect(saved).not.toHaveProperty('showRestTimer');
  });
});

describe('gymSessionStore — minuteur de repos', () => {
  it('fixe l\'heure de fin, la recalcule quand la durée change et l\'efface à l\'arrêt', () => {
    const { startRestTimer, setRestDuration, dismissRestTimer } = useGymSessionStore.getState();
    useGymSessionStore.setState({ restDuration: 90 });
    const t0 = Date.now();
    startRestTimer();
    expect(useGymSessionStore.getState().restEndsAt).toBeGreaterThanOrEqual(t0 + 90_000);

    setRestDuration(180);
    expect(useGymSessionStore.getState().restEndsAt).toBeGreaterThanOrEqual(t0 + 180_000);

    dismissRestTimer();
    expect(useGymSessionStore.getState()).toMatchObject({ showRestTimer: false, restEndsAt: null });
  });
});

describe('gymSessionStore — notification de fin de repos', () => {
  it('annule la notification si le repos est arrêté avant la fin, la garde s\'il est terminé', () => {
    const { startRestTimer, dismissRestTimer } = useGymSessionStore.getState();
    vi.mocked(cancelRestEnd).mockClear();
    startRestTimer();
    dismissRestTimer(); // arrêt anticipé
    expect(cancelRestEnd).toHaveBeenCalledTimes(1);

    useGymSessionStore.setState({ showRestTimer: true, restEndsAt: Date.now() - 1000 });
    dismissRestTimer(); // repos écoulé : la notification affichée doit rester
    expect(cancelRestEnd).toHaveBeenCalledTimes(1);
  });
});

describe('gymSessionStore — repos par exercice (#49)', () => {
  it('retient la durée changée pendant le repos d\'un exercice, garde la durée par défaut ailleurs', () => {
    const { startRestTimer, setRestDuration, dismissRestTimer } = useGymSessionStore.getState();
    useGymSessionStore.setState({ restDuration: 90, restByExercise: {} });
    const left = () => (useGymSessionStore.getState().restEndsAt ?? 0) - Date.now();

    startRestTimer('barbell_squat');
    setRestDuration(180); // pendant le repos du squat
    dismissRestTimer();
    expect(useGymSessionStore.getState()).toMatchObject({ restDuration: 90, restByExercise: { barbell_squat: 180 } });

    startRestTimer('barbell_squat');
    expect(left()).toBeGreaterThan(170_000);
    startRestTimer('barbell_curl');
    expect(left()).toBeLessThanOrEqual(90_000);

    startRestTimer(); // repos lancé à la main : change la durée par défaut
    setRestDuration(60);
    expect(useGymSessionStore.getState().restDuration).toBe(60);
    dismissRestTimer();

    const saved = JSON.parse(localStorage.getItem('reps_gym_session') ?? '{}').state;
    expect(saved.restByExercise).toEqual({ barbell_squat: 180 });
  });
});

describe('gymSessionStore — repos −15 s / +15 s (#51)', () => {
  it('décale la fin sans relancer le décompte, sans passer avant maintenant, et suit la notification', async () => {
    const { scheduleRestEnd } = await import('@/utils/restNotification');
    const { adjustRest } = useGymSessionStore.getState();
    const end = Date.now() + 30_000;
    useGymSessionStore.setState({ showRestTimer: true, restEndsAt: end });
    vi.mocked(scheduleRestEnd).mockClear();

    adjustRest(15);
    expect(useGymSessionStore.getState().restEndsAt).toBe(end + 15_000);
    expect(scheduleRestEnd).toHaveBeenLastCalledWith(end + 15_000);

    adjustRest(-15); adjustRest(-15); adjustRest(-15);
    expect(useGymSessionStore.getState().restEndsAt).toBeGreaterThanOrEqual(Date.now() - 50);
    expect(useGymSessionStore.getState().restEndsAt).toBeLessThanOrEqual(Date.now());

    useGymSessionStore.setState({ showRestTimer: false, restEndsAt: null });
    adjustRest(15); // pas de repos en cours : rien
    expect(useGymSessionStore.getState().restEndsAt).toBeNull();
  });
});
