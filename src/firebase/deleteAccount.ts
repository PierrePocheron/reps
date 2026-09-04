import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteUser, GoogleAuthProvider, reauthenticateWithPopup } from 'firebase/auth';
import { db, auth } from './config';
import { logger } from '@/utils/logger';

/**
 * Supprime toutes les données Firestore d'un utilisateur.
 * Appelé avant de supprimer le compte Firebase Auth.
 */
async function deleteUserFirestoreData(userId: string): Promise<void> {
  const batch = writeBatch(db);

  // ── Sous-collection userEvents (badges) ───────────────────────────────────
  const eventsSnap = await getDocs(collection(db, 'users', userId, 'userEvents'));
  eventsSnap.forEach((d) => batch.delete(d.ref));

  // Sous-collection privée (email, mensurations, token FCM…)
  const privateSnap = await getDocs(collection(db, 'users', userId, 'private'));
  privateSnap.forEach((d) => batch.delete(d.ref));

  // Notifications reçues
  const notifSnap = await getDocs(
    query(collection(db, 'notifications'), where('userId', '==', userId))
  );
  notifSnap.forEach((d) => batch.delete(d.ref));

  // ── Séances renforcement ───────────────────────────────────────────────────
  const sessionsSnap = await getDocs(collection(db, 'sessions', userId, 'userSessions'));
  sessionsSnap.forEach((d) => batch.delete(d.ref));

  // ── Séances musculation ────────────────────────────────────────────────────
  const gymSnap = await getDocs(collection(db, 'gym_sessions', userId, 'userGymSessions'));
  gymSnap.forEach((d) => batch.delete(d.ref));

  // ── Templates personnalisés ────────────────────────────────────────────────
  const templatesSnap = await getDocs(collection(db, 'userTemplates', userId, 'templates'));
  templatesSnap.forEach((d) => batch.delete(d.ref));

  // Commit les sous-collections (Firestore limite à 500 ops/batch)
  await batch.commit();

  // ── user_challenges ────────────────────────────────────────────────────────
  const challengesSnap = await getDocs(
    query(collection(db, 'user_challenges'), where('userId', '==', userId))
  );
  const challengesBatch = writeBatch(db);
  challengesSnap.forEach((d) => challengesBatch.delete(d.ref));

  // ── Exercices personnalisés ────────────────────────────────────────────────
  const exercisesSnap = await getDocs(
    query(collection(db, 'exercises'), where('userId', '==', userId))
  );
  exercisesSnap.forEach((d) => challengesBatch.delete(d.ref));

  // ── Demandes d'amis (envoyées et reçues) ──────────────────────────────────
  const sentSnap = await getDocs(
    query(collection(db, 'friend_requests'), where('fromUserId', '==', userId))
  );
  sentSnap.forEach((d) => challengesBatch.delete(d.ref));

  const receivedSnap = await getDocs(
    query(collection(db, 'friend_requests'), where('toUserId', '==', userId))
  );
  receivedSnap.forEach((d) => challengesBatch.delete(d.ref));

  await challengesBatch.commit();

  // ── Document utilisateur principal ────────────────────────────────────────
  await deleteDoc(doc(db, 'users', userId));
}

/**
 * Supprime le compte utilisateur :
 * 1. Efface toutes les données Firestore
 * 2. Supprime le compte Firebase Auth (avec re-authentification si nécessaire)
 *
 * Retourne `'reauthentication_required'` si une re-auth est nécessaire
 * avant de réessayer.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Aucun utilisateur connecté');

  // Étape 1 : Supprimer les données Firestore
  logger.info('Suppression des données Firestore...');
  await deleteUserFirestoreData(userId);

  // Étape 2 : Supprimer le compte Firebase Auth
  // Google impose une re-authentification récente avant deleteUser()
  try {
    await deleteUser(currentUser);
    logger.info('Compte Firebase Auth supprimé');
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === 'auth/requires-recent-login') {
      // Re-authentification via popup Google puis nouvelle tentative
      logger.info('Re-authentification Google requise pour la suppression');
      const provider = new GoogleAuthProvider();
      await reauthenticateWithPopup(currentUser, provider);
      await deleteUser(currentUser);
      logger.info('Compte Firebase Auth supprimé après re-auth');
    } else {
      throw err;
    }
  }
}
