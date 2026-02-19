import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { GymSession, GymSessionExercise } from './types';
import { logger } from '@/utils/logger';

/**
 * CRUD Firestore pour les séances de musculation
 * Collection : gym_sessions/{userId}/userGymSessions/{sessionId}
 */

type CreateGymSessionData = Omit<GymSession, 'sessionId' | 'createdAt'>;

/**
 * Crée une nouvelle séance de musculation dans Firestore
 */
export async function createGymSession(
  userId: string,
  data: CreateGymSessionData
): Promise<string> {
  try {
    const sessionsRef = collection(db, 'gym_sessions', userId, 'userGymSessions');
    const docRef = await addDoc(sessionsRef, {
      ...data,
      userId,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    logger.error('Erreur lors de la création de la séance muscu:', error as Error);
    throw error;
  }
}

/**
 * Récupère la dernière séance de musculation d'un utilisateur
 */
export async function getLastGymSession(userId: string): Promise<GymSession | null> {
  try {
    const sessionsRef = collection(db, 'gym_sessions', userId, 'userGymSessions');
    const q = query(sessionsRef, orderBy('date', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    if (!docSnap) return null;

    return { sessionId: docSnap.id, ...docSnap.data() } as GymSession;
  } catch (error) {
    logger.error('Erreur lors de la récupération de la dernière séance muscu:', error as Error);
    return null;
  }
}

/**
 * Récupère les N dernières séances de musculation d'un utilisateur
 */
export async function getUserGymSessions(
  userId: string,
  limitCount = 20
): Promise<GymSession[]> {
  try {
    const sessionsRef = collection(db, 'gym_sessions', userId, 'userGymSessions');
    const q = query(sessionsRef, orderBy('date', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => ({
      sessionId: docSnap.id,
      ...docSnap.data(),
    })) as GymSession[];
  } catch (error) {
    logger.error('Erreur lors de la récupération des séances muscu:', error as Error);
    return [];
  }
}

/**
 * Calcule le volume total d'une séance (kg soulevés)
 */
export function calculateTotalVolume(exercises: GymSessionExercise[]): number {
  return exercises.reduce((total, ex) => {
    const exerciseVolume = ex.sets
      .filter((s) => s.completed)
      .reduce((sum, s) => {
        const reps = s.actualReps ?? s.reps;
        const weight = s.actualWeight ?? s.weight;
        return sum + reps * weight;
      }, 0);
    return total + exerciseVolume;
  }, 0);
}
