import { useState, useEffect } from 'react';
import { getExerciseImages, type ExerciseInfo } from '@/firebase/exerciseImages';

let cachedMap: Record<string, ExerciseInfo> | null = null;
let fetchPromise: Promise<Record<string, ExerciseInfo>> | null = null;

export function useExerciseImages() {
  const [infoMap, setInfoMap] = useState<Record<string, ExerciseInfo>>(cachedMap ?? {});
  const [loading, setLoading] = useState(cachedMap === null);

  useEffect(() => {
    if (cachedMap !== null) { setInfoMap(cachedMap); setLoading(false); return; }
    if (!fetchPromise) fetchPromise = getExerciseImages();
    fetchPromise.then((data) => { cachedMap = data; setInfoMap(data); setLoading(false); });
  }, []);

  // Helpers
  const getImageUrl = (exerciseId: string): string | null =>
    infoMap[exerciseId]?.imageUrl ?? null;

  const getDescription = (exerciseId: string): string | null =>
    infoMap[exerciseId]?.description ?? null;

  // imageMap pour compatibilité avec le code existant
  const imageMap: Record<string, string> = {};
  Object.entries(infoMap).forEach(([id, info]) => {
    if (info.imageUrl) imageMap[id] = info.imageUrl;
  });

  return { imageMap, infoMap, getImageUrl, getDescription, loading };
}
