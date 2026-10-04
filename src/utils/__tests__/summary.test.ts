import { describe, it, expect } from 'vitest';
import { gymSummary, volumeComparison } from '../summary';
import type { GymSessionExercise } from '@/firebase/types';

const ex = (exerciseId: string, sets: GymSessionExercise['sets']): GymSessionExercise => ({ exerciseId, name: exerciseId, emoji: '🏋️', sets });

describe('gymSummary', () => {
  it('volume et séries de travail (échauffement exclu), records, écart avec la dernière séance commune', () => {
    const now = [ex('bench_press', [
      { weight: 40, reps: 10, completed: true, type: 'warmup' },
      { weight: 80, reps: 8, completed: true, isRecord: true },
      { weight: 80, reps: 8, completed: true },
      { weight: 80, reps: 8, completed: false },
    ])];
    const history = [
      { exercises: [ex('deadlift', [])], totalVolume: 5000 }, // aucun exercice en commun : ignorée
      { exercises: [ex('bench_press', [])], totalVolume: 1000 },
    ];
    expect(gymSummary(now, history)).toEqual({ volume: 1280, sets: 2, records: 1, deltaPct: 28 });
    expect(gymSummary(now, []).deltaPct).toBeNull();
  });
});

describe('volumeComparison', () => {
  it('toujours encourageante', () => {
    expect(volumeComparison(28)).toMatch(/^\+28 %/);
    expect(volumeComparison(0)).toMatch(/Même volume/);
    expect(volumeComparison(-5)).toMatch(/plus léger.*-5 %/);
    expect(volumeComparison(null)).toBeNull();
  });
});
