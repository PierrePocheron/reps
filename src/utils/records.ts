import type { GymSession } from '@/firebase/types';

/** 1RM estimé (formule d'Epley) — 0 pour une série sans charge. */
export const estimate1RM = (weight: number, reps: number): number =>
  weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;

/** Meilleur 1RM estimé par exercice, sur les séries validées des séances muscu. */
export function bestE1RMByExercise(sessions: GymSession[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!set.completed) continue;
        const e = estimate1RM(set.actualWeight ?? set.weight, set.actualReps ?? set.reps);
        best[ex.exerciseId] = Math.max(best[ex.exerciseId] ?? 0, e);
      }
    }
  }
  return best;
}
