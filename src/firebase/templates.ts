import {
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from './config';
import { queuedIfOffline } from './offline';
import type { WorkoutTemplate } from './types';
import { logger } from '@/utils/logger';

type CreateTemplateData = Omit<WorkoutTemplate, 'id' | 'userId' | 'createdAt'>;

/**
 * Récupère les templates personnalisés d'un utilisateur
 */
export async function getUserTemplates(userId: string): Promise<WorkoutTemplate[]> {
  try {
    const ref = collection(db, 'userTemplates', userId, 'templates');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, userId, ...d.data() }) as WorkoutTemplate);
  } catch (error) {
    logger.error('Erreur lors de la récupération des templates:', error as Error);
    return [];
  }
}

/**
 * Crée un nouveau template personnalisé
 */
export async function createUserTemplate(
  userId: string,
  data: CreateTemplateData
): Promise<WorkoutTemplate> {
  try {
    const docRef = doc(collection(db, 'userTemplates', userId, 'templates')); // id known even while offline
    await queuedIfOffline(setDoc(docRef, {
      ...data,
      userId,
      createdAt: Timestamp.now(),
    }));
    return { id: docRef.id, userId, ...data, createdAt: Timestamp.now() };
  } catch (error) {
    logger.error('Erreur lors de la création du template:', error as Error);
    throw error;
  }
}

/**
 * Supprime un template personnalisé
 */
export async function deleteUserTemplate(userId: string, templateId: string): Promise<void> {
  try {
    const ref = doc(db, 'userTemplates', userId, 'templates', templateId);
    await queuedIfOffline(deleteDoc(ref));
  } catch (error) {
    logger.error('Erreur lors de la suppression du template:', error as Error);
    throw error;
  }
}

/**
 * Met à jour un modèle perso en place (même ID)
 */
export async function updateUserTemplate(userId: string, templateId: string, data: CreateTemplateData): Promise<void> {
  try {
    // a type switch drops the other type's list: updateDoc merges, the old one stayed (card showing « 5 exo » for 1)
    const other = data.workoutType === 'musculation' ? { exerciseIds: deleteField() } : { muscuExercises: deleteField() };
    await queuedIfOffline(updateDoc(doc(db, 'userTemplates', userId, 'templates', templateId), { ...other, ...data }));
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du template:', error as Error);
    throw error;
  }
}
