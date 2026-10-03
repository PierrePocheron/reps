import exerciseDetails from '@/data/exerciseDetails.json';
import { MUSCULATION_EXERCISES } from '@/utils/constants';
import type { GymSession } from '@/firebase/types';

const DETAILS = exerciseDetails as Record<string, { target: string }>;
const SMALL_MUSCLES = new Set(['delts', 'biceps', 'triceps']);

/** +2,5 kg, ou +1,25 kg sur les petits muscles (épaules, bras), comme Boostcamp. */
export function incrementFor(exerciseId: string): number {
  const target = DETAILS[exerciseId]?.target;
  const category = MUSCULATION_EXERCISES.find((e) => e.id === exerciseId)?.category;
  return (target && SMALL_MUSCLES.has(target)) || category === 'arms' || category === 'shoulders' ? 1.25 : 2.5;
}

export interface LoadSuggestion {
  from: number;        // charge de travail de la dernière séance
  to: number;          // charge suggérée
  summary: string;     // ce qui a été réussi, pour expliquer la règle
}

/**
 * Surcharge progressive linéaire (Liftosaur / Boostcamp, sans IA) : si à la dernière séance de l'exercice
 * toutes les séries de travail ont été validées avec au moins les reps visées, on propose la charge + incrément.
 * `history` : séances du plus récent au plus ancien.
 */
export function suggestNextWeight(history: GymSession[], exerciseId: string): LoadSuggestion | null {
  for (const session of history) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const work = ex.sets.filter((s) => s.type !== 'warmup');
    if (work.length === 0) continue;
    const allHit = work.every((s) => s.completed && (s.actualReps ?? s.reps) >= s.reps);
    const from = Math.max(...work.map((s) => s.actualWeight ?? s.weight));
    if (!allHit || from <= 0) return null; // charge à confirmer, ou exercice au poids du corps
    const reps = Math.min(...work.map((s) => s.actualReps ?? s.reps));
    return { from, to: from + incrementFor(exerciseId), summary: `${work.length} × ${reps} à ${from.toLocaleString('fr-FR')} kg` };
  }
  return null;
}

/** Séries de travail de la dernière séance de l'exercice (Hevy les recopie à l'ajout) ; [] s'il n'a jamais été fait. */
export function lastWorkSets(history: GymSession[], exerciseId: string): { reps: number; weight: number }[] {
  for (const session of history) {
    const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (!ex) continue;
    const work = ex.sets.filter((s) => s.type !== 'warmup');
    const done = work.filter((s) => s.completed);
    return (done.length ? done : work).map((s) => ({ reps: s.actualReps ?? s.reps, weight: s.actualWeight ?? s.weight }));
  }
  return [];
}
