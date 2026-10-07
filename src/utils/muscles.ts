import exerciseDetails from '@/data/exerciseDetails.json';
import { DEFAULT_EXERCISES, MUSCULATION_EXERCISES, findDefaultExercise } from '@/utils/constants';
import type { ExerciseCategory, GymSession, Session } from '@/firebase/types';
import { isWorkSet } from '@/utils/records';

export const MUSCLE_GROUPS = ['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Abdos', 'Jambes'] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

// Muscles du dataset (anglais) → groupe affiché ; les autres (cardio, chevilles…) sont ignorés
const GROUP_OF: Record<string, MuscleGroup> = {
  pectorals: 'Pectoraux', chest: 'Pectoraux',
  lats: 'Dos', 'upper back': 'Dos', 'lower back': 'Dos', traps: 'Dos', trapezius: 'Dos',
  delts: 'Épaules', deltoids: 'Épaules', shoulders: 'Épaules',
  biceps: 'Bras', triceps: 'Bras', forearms: 'Bras',
  abs: 'Abdos', core: 'Abdos', obliques: 'Abdos',
  quads: 'Jambes', quadriceps: 'Jambes', hamstrings: 'Jambes', glutes: 'Jambes', calves: 'Jambes', soleus: 'Jambes', 'hip flexors': 'Jambes',
};
const CATEGORY_GROUP: Partial<Record<ExerciseCategory, MuscleGroup>> = {
  chest: 'Pectoraux', back: 'Dos', shoulders: 'Épaules', arms: 'Bras', core: 'Abdos', legs: 'Jambes',
};

const DETAILS = exerciseDetails as Record<string, { target: string; secondaryMuscles: string[] }>;
const BUILT_IN = [...DEFAULT_EXERCISES, ...MUSCULATION_EXERCISES];

/** Groupe principal + secondaires (sans doublon) d'un exercice intégré ; inconnu (perso, bibliothèque) → rien. */
function musclesOf(exerciseId: string): { primary?: MuscleGroup; secondary: MuscleGroup[] } {
  const detail = DETAILS[exerciseId];
  const primary = (detail && GROUP_OF[detail.target])
    ?? CATEGORY_GROUP[BUILT_IN.find((e) => e.id === exerciseId)?.category ?? 'cardio'];
  const secondary = [...new Set((detail?.secondaryMuscles ?? []).map((m) => GROUP_OF[m]))]
    .filter((g): g is MuscleGroup => !!g && g !== primary);
  return { primary, secondary };
}

// ponytail: le renfo ne stocke que des reps par exercice ; 1 série ≈ 12 reps pour le comparer à la muscu
export const REPS_PER_SET = 12;

/** Séries par groupe musculaire depuis `since` : muscle principal 1, secondaire ½ (comme Hevy). */
export function setsByMuscle(gymSessions: GymSession[], sessions: Session[], since: Date, until = new Date(8.64e15)): Record<MuscleGroup, number> {
  const out = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<MuscleGroup, number>;
  const add = (exerciseId: string, sets: number) => {
    const { primary, secondary } = musclesOf(exerciseId);
    if (primary) out[primary] += sets;
    for (const g of secondary) out[g] += sets / 2;
  };
  for (const s of gymSessions) {
    if (s.date.toDate() < since || s.date.toDate() >= until) continue;
    for (const ex of s.exercises) add(ex.exerciseId, ex.sets.filter(isWorkSet).length);
  }
  for (const s of sessions) {
    if (s.date.toDate() < since || s.date.toDate() >= until) continue;
    for (const ex of s.exercises) {
      const id = findDefaultExercise(ex.name)?.id;
      if (id && ex.reps > 0) add(id, Math.max(1, Math.round(ex.reps / REPS_PER_SET)));
    }
  }
  return out;
}
