import { describe, it, expect } from 'vitest';
import { gymSummary, comparisonText } from '../summary';
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

describe('comparisonText', () => {
  it('toujours encourageante, en volume (muscu) ou en reps (renfo)', () => {
    expect(comparisonText(28)).toMatch(/^\+28 % de volume/);
    expect(comparisonText(0)).toMatch(/Même volume/);
    expect(comparisonText(-5)).toMatch(/plus léger.*-5 %/);
    expect(comparisonText(null)).toBeNull();
    expect(comparisonText(12, 'reps')).toMatch(/^\+12 % de reps/);
    expect(comparisonText(0, 'reps')).toMatch(/Autant de reps/);
    expect(comparisonText(-3, 'reps')).toMatch(/moins de reps.*-3 %/);
  });
});
