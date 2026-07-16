import exerciseDetails from '@/data/exerciseDetails.json';

/**
 * Détails d'exercices embarqués dans l'app (aucun appel réseau).
 * Générés par scripts/import-exercise-media.mjs depuis le dataset
 * hasaneyldrm/exercises-dataset (données MIT, médias © Gym visual).
 */
export interface ExerciseInfo {
  imageUrl: string | null;
  gifUrl: string | null;
  description: string | null;
  steps: string[];
  target: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
}

export const MEDIA_ATTRIBUTION = '© Gym visual — gymvisual.com';

interface RawDetail {
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  steps: string[];
  image: string;
  gif: string;
}

const infoMap: Record<string, ExerciseInfo> = {};
Object.entries(exerciseDetails as Record<string, RawDetail>).forEach(([id, d]) => {
  infoMap[id] = {
    imageUrl: d.image,
    gifUrl: d.gif,
    description: d.steps.join(' '),
    steps: d.steps,
    target: d.target,
    secondaryMuscles: d.secondaryMuscles,
    equipment: d.equipment,
  };
});

const imageMap: Record<string, string> = {};
Object.entries(infoMap).forEach(([id, info]) => {
  if (info.imageUrl) imageMap[id] = info.imageUrl;
});

export function useExerciseImages() {
  const getImageUrl = (exerciseId: string): string | null =>
    infoMap[exerciseId]?.imageUrl ?? null;

  const getDescription = (exerciseId: string): string | null =>
    infoMap[exerciseId]?.description ?? null;

  return { imageMap, infoMap, getImageUrl, getDescription, loading: false };
}
