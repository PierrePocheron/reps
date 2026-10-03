import { describe, it, expect } from 'vitest';
import { useGymSessionStore } from '../gymSessionStore';

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
