import type { GymSession, GymSessionExercise, PlannedSet } from '@/firebase/types';

/** Série de travail validée : l'échauffement ne compte ni dans le volume, ni dans les records, ni dans les stats. */
export const isWorkSet = (s: Pick<PlannedSet, 'completed' | 'type'>) => s.completed && s.type !== 'warmup';

/** 1RM estimé (formule d'Epley) — 0 pour une série sans charge. */
export const estimate1RM = (weight: number, reps: number): number =>
  weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;

/** Meilleur 1RM estimé par exercice, sur les séries validées des séances muscu. */
export function bestE1RMByExercise(sessions: GymSession[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!isWorkSet(set)) continue;
        const e = estimate1RM(set.actualWeight ?? set.weight, set.actualReps ?? set.reps);
        best[ex.exerciseId] = Math.max(best[ex.exerciseId] ?? 0, e);
      }
    }
  }
  return best;
}

export interface ExercisePoint {
  date: Date;
  e1rm: number;        // meilleur 1RM estimé de la séance
  bestWeight: number;  // charge max soulevée
  volume: number;      // Σ poids × reps des séries validées
}

/** Une entrée par séance où l'exercice a des séries validées, triée chronologiquement. */
export function exerciseHistory(sessions: GymSession[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const session of sessions) {
    const sets = session.exercises
      .filter((ex) => ex.exerciseId === exerciseId)
      .flatMap((ex) => ex.sets.filter(isWorkSet));
    if (sets.length === 0) continue;
    let e1rm = 0, bestWeight = 0, volume = 0;
    for (const s of sets) {
      const w = s.actualWeight ?? s.weight;
      const r = s.actualReps ?? s.reps;
      e1rm = Math.max(e1rm, estimate1RM(w, r));
      bestWeight = Math.max(bestWeight, w);
      volume += w * r;
    }
    points.push({ date: session.date.toDate(), e1rm, bestWeight, volume });
  }
  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Trophées d'une séance modifiée (#57), mêmes règles qu'en direct : une série de travail est un record si elle bat
 * le meilleur 1RM estimé des séances précédentes (puis des séries d'avant dans la séance) ; pas d'historique = pas de record.
 */
export function markRecords(exercises: GymSessionExercise[], older: GymSession[]): GymSessionExercise[] {
  const best = bestE1RMByExercise(older);
  return exercises.map((ex) => {
    let top = best[ex.exerciseId];
    return {
      ...ex,
      sets: ex.sets.map((s) => {
        const e = estimate1RM(s.actualWeight ?? s.weight, s.actualReps ?? s.reps);
        const isRecord = isWorkSet(s) && top !== undefined && e > top;
        if (isRecord) top = e;
        return { ...s, isRecord };
      }),
    };
  });
}
