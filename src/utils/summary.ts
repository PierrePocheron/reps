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
    deltaPct: previous?.totalVolume ? Math.round(((volume - previous.totalVolume) / previous.totalVolume) * 100) : null,
  };
}

/** Phrase de comparaison, toujours encourageante (Gentler Streak) ; null sans séance de référence. */
export function volumeComparison(deltaPct: number | null): string | null {
  if (deltaPct === null) return null;
  if (deltaPct > 0) return `+${deltaPct} % de volume par rapport à ta dernière séance 📈`;
  if (deltaPct === 0) return 'Même volume que ta dernière séance : régulier 👊';
  return `Volume un peu plus léger que la dernière fois (${deltaPct} %) : chaque séance compte`;
}
