import { describe, it, expect } from 'vitest';
import { gymSummary, comparisonText } from '../summary';
import { Timestamp } from 'firebase/firestore';
import type { GymSessionExercise } from '@/firebase/types';

const ex = (exerciseId: string, sets: GymSessionExercise['sets']): GymSessionExercise => ({ exerciseId, name: exerciseId, emoji: '🏋️', sets });
const on = (day: number) => Timestamp.fromDate(new Date(2026, 9, day, 18));

describe('gymSummary', () => {
  it('volume et séries de travail (échauffement exclu), records, écart avec la dernière séance commune', () => {
    const now = [ex('bench_press', [
      { weight: 40, reps: 10, completed: true, type: 'warmup' },
      { weight: 80, reps: 8, completed: true, isRecord: true },
      { weight: 80, reps: 8, completed: true },
      { weight: 80, reps: 8, completed: false },
    ])];
    const history = [
      { date: on(6), exercises: [ex('deadlift', [])], totalVolume: 5000 }, // aucun exercice en commun : ignorée
      { date: on(5), exercises: [ex('bench_press', [])], totalVolume: 1000 },
    ];
    expect(gymSummary(now, history)).toEqual({ volume: 1280, sets: 2, records: 1, deltaPct: 28 });
    expect(gymSummary(now, []).deltaPct).toBeNull();
  });

  it('une séance oubliée (antidatée) se compare à la dernière séance d\'avant sa date, pas à la plus récente', () => {
    const now = [ex('bench_press', [{ weight: 80, reps: 10, completed: true }])]; // 800 kg
    const history = [
      { date: on(5), exercises: [ex('bench_press', [])], totalVolume: 1000 },
      { date: on(1), exercises: [ex('bench_press', [])], totalVolume: 400 },
    ];
    expect(gymSummary(now, history, new Date(2026, 9, 3, 18).getTime()).deltaPct).toBe(100);
    expect(gymSummary(now, history, new Date(2026, 8, 20).getTime()).deltaPct).toBeNull(); // rien avant : pas de comparaison
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
