import { describe, it, expect } from 'vitest';
import { estimate1RM, bestE1RMByExercise } from '../records';
import type { GymSession } from '@/firebase/types';

const session = (sets: { weight: number; reps: number; completed: boolean }[]) =>
  ({ exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets }] }) as unknown as GymSession;

describe('records', () => {
  it('estime le 1RM (Epley) et ignore les séries sans charge', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 1);
    expect(estimate1RM(0, 20)).toBe(0);
  });

  it('garde le meilleur 1RM par exercice, séries validées uniquement', () => {
    const best = bestE1RMByExercise([
      session([{ weight: 80, reps: 8, completed: true }, { weight: 120, reps: 5, completed: false }]),
      session([{ weight: 85, reps: 6, completed: true }]),
    ]);
    expect(best.bench_press).toBeCloseTo(102, 1); // 85×6 (102) bat 80×8 (101,3) ; 120×5 non validée ignorée
  });
});
