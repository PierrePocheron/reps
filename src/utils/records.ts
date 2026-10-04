import type { GymSession, GymSessionExercise, PlannedSet } from '@/firebase/types';

/** Exercices en durée par défaut (gainage) ; l'utilisateur bascule les autres (reps ⇄ s) en séance (#55). */
const TIMED_BY_DEFAULT = new Set(['weighted_plank']);
export const isTimed = (ex: Pick<GymSessionExercise, 'exerciseId' | 'timed'>) => ex.timed ?? TIMED_BY_DEFAULT.has(ex.exerciseId);

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
      if (isTimed(ex)) continue; // une durée n'a pas de 1RM
      for (const set of ex.sets) {
        if (!isWorkSet(set)) continue;
        const e = estimate1RM(set.actualWeight ?? set.weight, set.actualReps ?? set.reps);
        best[ex.exerciseId] = Math.max(best[ex.exerciseId] ?? 0, e);
      }
    }
  }
  return best;
}

/** Meilleure durée (s) par exercice en durée, sur les séries validées (#59). */
export function bestSecondsByExercise(sessions: GymSession[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (!isTimed(ex)) continue;
      for (const set of ex.sets) if (isWorkSet(set)) best[ex.exerciseId] = Math.max(best[ex.exerciseId] ?? 0, set.actualReps ?? set.reps);
    }
  }
  return best;
}

export interface ExercisePoint {
  date: Date;
  e1rm: number;        // meilleur 1RM estimé de la séance
  bestWeight: number;  // charge max soulevée
  volume: number;      // Σ poids × reps des séries validées
  bestSeconds: number; // meilleure durée (exercice en durée, #55)
}

/** Une entrée par séance où l'exercice a des séries validées, triée chronologiquement. */
export function exerciseHistory(sessions: GymSession[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];
  for (const session of sessions) {
    const exs = session.exercises.filter((ex) => ex.exerciseId === exerciseId);
    const sets = exs.flatMap((ex) => ex.sets.filter(isWorkSet));
    if (sets.length === 0) continue;
    const timed = exs.some(isTimed); // en durée : seule la meilleure durée a un sens
    let e1rm = 0, bestWeight = 0, volume = 0, bestSeconds = 0;
    for (const s of sets) {
      const w = s.actualWeight ?? s.weight;
      const r = s.actualReps ?? s.reps;
      if (timed) { bestSeconds = Math.max(bestSeconds, r); continue; }
      e1rm = Math.max(e1rm, estimate1RM(w, r));
      bestWeight = Math.max(bestWeight, w);
      volume += w * r;
    }
    points.push({ date: session.date.toDate(), e1rm, bestWeight, volume, bestSeconds });
  }
  return points.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Trophées d'une séance modifiée (#57), mêmes règles qu'en direct : une série de travail est un record si elle bat
 * le meilleur 1RM estimé des séances précédentes (puis des séries d'avant dans la séance) ; pas d'historique = pas de record.
 */
export function markRecords(exercises: GymSessionExercise[], older: GymSession[]): GymSessionExercise[] {
  const best = bestE1RMByExercise(older), bestSecs = bestSecondsByExercise(older);
  return exercises.map((ex) => {
    const timed = isTimed(ex); // en durée : record = meilleure durée (#59)
    let top = timed ? bestSecs[ex.exerciseId] : best[ex.exerciseId];
    return {
      ...ex,
      sets: ex.sets.map((s) => {
        const score = timed ? s.actualReps ?? s.reps : estimate1RM(s.actualWeight ?? s.weight, s.actualReps ?? s.reps);
        const isRecord = isWorkSet(s) && top !== undefined && score > top;
        if (isRecord) top = score;
        return { ...s, isRecord };
      }),
    };
  });
}

export interface ExerciseLogEntry { date: Date; sets: string; record: boolean }

/**
 * Dernières séances d'un exercice, séries de travail en clair (onglet « Historique » de Strong, #60) :
 * « 8×80 · 6×82,5 kg », « 12 · 10 reps » au poids du corps, « 60 · 75 s » en durée. `sessions` : du plus récent au plus ancien.
 */
export function exerciseLog(sessions: GymSession[], exerciseId: string, limit = 10): ExerciseLogEntry[] {
  const out: ExerciseLogEntry[] = [];
  const num = (n: number) => n.toLocaleString('fr-FR');
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const work = ex.sets.filter(isWorkSet);
      if (work.length === 0) continue;
      const reps = (s: (typeof work)[number]) => s.actualReps ?? s.reps;
      const weight = (s: (typeof work)[number]) => s.actualWeight ?? s.weight;
      const sets = isTimed(ex) ? `${work.map((s) => num(reps(s))).join(' · ')} s`
        : work.some((s) => weight(s) > 0) ? `${work.map((s) => `${reps(s)}×${num(weight(s))}`).join(' · ')} kg`
        : `${work.map(reps).join(' · ')} reps`;
      out.push({ date: session.date.toDate(), sets, record: work.some((s) => s.isRecord) });
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
