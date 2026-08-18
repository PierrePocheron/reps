import { useMemo } from 'react';
import exerciseDetails from '@/data/exerciseDetails.json';
import { useLanguage, type Language } from '@/hooks/useLanguage';

/**
 * Détails des exercices essentiels embarqués dans l'app (aucun appel réseau).
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
  stepsEn?: string[];
  image: string;
  gif: string;
}

const RAW = exerciseDetails as Record<string, RawDetail>;

function buildInfoMap(lang: Language): Record<string, ExerciseInfo> {
  const map: Record<string, ExerciseInfo> = {};
  Object.entries(RAW).forEach(([id, d]) => {
    const steps = lang === 'en' && d.stepsEn?.length ? d.stepsEn : d.steps;
    map[id] = {
      imageUrl: d.image,
      gifUrl: d.gif,
      description: steps.join(' '),
      steps,
      target: d.target,
      secondaryMuscles: d.secondaryMuscles,
      equipment: d.equipment,
    };
  });
  return map;
}

const INFO_BY_LANG: Record<Language, Record<string, ExerciseInfo>> = {
  fr: buildInfoMap('fr'),
  en: buildInfoMap('en'),
};

/** Vignettes locales (identiques quelle que soit la langue) */
const IMAGE_MAP: Record<string, string> = {};
Object.entries(RAW).forEach(([id, d]) => {
  IMAGE_MAP[id] = d.image;
});

export function useExerciseImages() {
  const lang = useLanguage();
  const infoMap = INFO_BY_LANG[lang];

  return useMemo(() => {
    const getImageUrl = (exerciseId: string): string | null =>
      infoMap[exerciseId]?.imageUrl ?? null;
    const getDescription = (exerciseId: string): string | null =>
      infoMap[exerciseId]?.description ?? null;
    return { imageMap: IMAGE_MAP, infoMap, getImageUrl, getDescription, loading: false, lang };
  }, [infoMap, lang]);
}
