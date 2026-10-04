import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
  deleteDoc,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { queuedIfOffline } from './offline';
import type { GymSession, GymSessionExercise } from './types';
import { logger } from '@/utils/logger';
import { isWorkSet, isTimed } from '@/utils/records';

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
): Promise<string | undefined> {
  try {
    const sessionsRef = collection(db, 'gym_sessions', userId, 'userGymSessions');
    const docRef = await queuedIfOffline(addDoc(sessionsRef, {
      ...data,
      userId,
      createdAt: Timestamp.now(),
    }));
    return docRef?.id; // undefined hors ligne : écriture en file
  } catch (error) {
    logger.error('Erreur lors de la création de la séance muscu:', error as Error);
    throw error;
  }
}

/** Gym sessions within [from, to): period recaps must not stop at the latest page of history. */
export async function getUserGymSessionsBetween(userId: string, from: Date, to: Date): Promise<GymSession[]> {
  const q = query(collection(db, 'gym_sessions', userId, 'userGymSessions'),
    where('date', '>=', Timestamp.fromDate(from)), where('date', '<', Timestamp.fromDate(to)), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({ sessionId: docSnap.id, ...docSnap.data() })) as GymSession[];
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
    throw error;
  }
}

/**
 * Calcule le volume total d'une séance (kg soulevés)
 */
export const NOTE_MAX = 300;

/** Firestore rejette les valeurs `undefined` — on les retire (fin de séance et modification). */
// min=0 on the inputs does not stop typing « -5 »: never persist a negative or NaN weight / rep count
const nonNegative = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

export function sanitizeExercises(exercises: GymSessionExercise[]): GymSessionExercise[] {
  return exercises.map((ex) => ({
    exerciseId: ex.exerciseId,
    name: ex.name,
    emoji: ex.emoji,
    ...(ex.imageUrl ? { imageUrl: ex.imageUrl } : {}),
    ...(ex.note?.trim() ? { note: ex.note.trim().slice(0, NOTE_MAX) } : {}),
    ...(ex.supersetId ? { supersetId: ex.supersetId } : {}),
    ...(ex.timed !== undefined ? { timed: ex.timed } : {}),
    sets: ex.sets.map((s) => ({
      reps: nonNegative(s.reps),
      weight: nonNegative(s.weight),
      completed: s.completed,
      ...(s.actualReps !== undefined ? { actualReps: nonNegative(s.actualReps) } : {}),
      ...(s.actualWeight !== undefined ? { actualWeight: nonNegative(s.actualWeight) } : {}),
      ...(s.isRecord ? { isRecord: true } : {}), // trophée et records sur la carte partagée depuis l'historique
      ...(s.rpe ? { rpe: s.rpe } : {}),
      ...(s.type ? { type: s.type } : {}),
    })),
  }));
}

/** Modifier une séance muscu passée (#57) : séries, volume et nombre de séries de travail recalculés. */
export async function updateGymSession(userId: string, sessionId: string, exercises: GymSessionExercise[]) {
  const clean = sanitizeExercises(exercises);
  const fields = {
    exercises: clean,
    totalVolume: Math.round(calculateTotalVolume(clean)),
    totalSets: clean.reduce((n, ex) => n + ex.sets.filter(isWorkSet).length, 0),
  };
  await queuedIfOffline(updateDoc(doc(db, 'gym_sessions', userId, 'userGymSessions', sessionId), fields));
  return fields;
}

/** Importer des séances (export Strong / Hevy, #61), par lots de 400 écritures (limite Firestore : 500). */
export async function importGymSessions(userId: string, sessions: { date: Date; duration: number; exercises: GymSessionExercise[]; title?: string; note?: string }[]): Promise<void> {
  const ref = collection(db, 'gym_sessions', userId, 'userGymSessions');
  for (let i = 0; i < sessions.length; i += 400) {
    const batch = writeBatch(db);
    for (const s of sessions.slice(i, i + 400)) {
      const exercises = sanitizeExercises(s.exercises);
      batch.set(doc(ref), {
        userId,
        date: Timestamp.fromDate(s.date),
        duration: s.duration,
        exercises,
        ...(s.title ? { title: s.title } : {}),
        ...(s.note ? { note: s.note } : {}),
        totalVolume: Math.round(calculateTotalVolume(exercises)),
        totalSets: exercises.reduce((n, ex) => n + ex.sets.filter(isWorkSet).length, 0),
        createdAt: Timestamp.now(),
      });
    }
    await batch.commit();
  }
}

/** Supprimer une séance muscu (#56) : le classement et le fil lisent les séances en direct ; stats à recalculer. */
export async function deleteGymSession(userId: string, sessionId: string): Promise<void> {
  await queuedIfOffline(deleteDoc(doc(db, 'gym_sessions', userId, 'userGymSessions', sessionId)));
}

export function calculateTotalVolume(exercises: GymSessionExercise[]): number {
  return exercises.reduce((total, ex) => {
    if (isTimed(ex)) return total; // secondes × kg n'est pas un volume
    const exerciseVolume = ex.sets
      .filter(isWorkSet)
      .reduce((sum, s) => {
        const reps = s.actualReps ?? s.reps;
        const weight = s.actualWeight ?? s.weight;
        return sum + reps * weight;
      }, 0);
    return total + exerciseVolume;
  }, 0);
}
