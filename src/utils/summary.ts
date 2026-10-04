import { calculateTotalVolume } from '@/firebase/gymSessions';
import { isWorkSet } from '@/utils/records';
import type { GymSession, GymSessionExercise } from '@/firebase/types';

/**
 * Récap de fin de séance muscu (Hevy « Workout complete ») : volume, séries, records, et écart de volume
 * avec la dernière séance qui partage au moins un exercice. `history` : du plus récent au plus ancien.
 */
export function gymSummary(exercises: GymSessionExercise[], history: Pick<GymSession, 'exercises' | 'totalVolume'>[]) {
  const ids = new Set(exercises.map((ex) => ex.exerciseId));
  const previous = history.find((s) => s.exercises.some((ex) => ids.has(ex.exerciseId)));
  const volume = Math.round(calculateTotalVolume(exercises));
  return {
    volume,
    sets: exercises.reduce((n, ex) => n + ex.sets.filter(isWorkSet).length, 0),
    records: exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.isRecord).length, 0),
    deltaPct: deltaPct(volume, previous?.totalVolume),
  };
}

/** Écart en % arrondi ; null sans référence. */
export const deltaPct = (now: number, before: number | null | undefined) =>
  before ? Math.round(((now - before) / before) * 100) : null;

/** Phrase de comparaison, toujours encourageante (Gentler Streak) ; null sans séance de référence. */
export function comparisonText(delta: number | null, kind: 'volume' | 'reps' = 'volume'): string | null {
  if (delta === null) return null;
  const volume = kind === 'volume';
  if (delta > 0) return `+${delta} % ${volume ? 'de volume' : 'de reps'} par rapport à ta dernière séance 📈`;
  if (delta === 0) return `${volume ? 'Même volume' : 'Autant de reps'} que ta dernière séance : régulier 👊`;
  return `${volume ? 'Volume un peu plus léger' : 'Un peu moins de reps'} que la dernière fois (${delta} %) : chaque séance compte`;
}
