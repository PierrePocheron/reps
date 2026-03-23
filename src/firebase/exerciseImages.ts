import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';

export interface ExerciseInfo {
  imageUrl: string | null;
  description: string | null;
}

export async function getExerciseImages(): Promise<Record<string, ExerciseInfo>> {
  try {
    const snapshot = await getDocs(collection(db, 'default_exercises'));
    const map: Record<string, ExerciseInfo> = {};
    snapshot.docs.forEach((doc) => {
      const d = doc.data();
      map[doc.id] = {
        imageUrl: d.imageUrl ?? null,
        description: d.description ?? null,
      };
    });
    return map;
  } catch (error) {
    logger.error('Erreur lors de la récupération des images des exercices:', error as Error);
    return {};
  }
}
