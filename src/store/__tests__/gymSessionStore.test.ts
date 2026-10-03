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
