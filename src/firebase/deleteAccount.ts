import {
  clearIndexedDbPersistence,
  collection,
  doc,
  getDocs,
  query,
  where,
  terminate,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User as FirebaseUser,
} from 'firebase/auth';
import { db, auth } from './config';
import { logger } from '@/utils/logger';

/** Limite Firestore : 500 opérations par batch — marge de sécurité. */
const BATCH_SIZE = 450;

async function deleteRefsInChunks(refs: DocumentReference[]): Promise<void> {
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

/**
 * Re-authentification AVANT toute destruction : si elle échoue, aucune
 * donnée n'est perdue. Firebase exige une connexion récente pour deleteUser().
 * - Compte Google : popup de ré-authentification.
 * - Compte email/mot de passe : credential avec le mot de passe fourni.
 */
async function reauthenticate(currentUser: FirebaseUser, password?: string): Promise<void> {
  const providers = currentUser.providerData.map((p) => p.providerId);

  if (providers.includes('password')) {
    if (!password) {
      const err = new Error('Mot de passe requis pour supprimer le compte');
      (err as Error & { code: string }).code = 'app/password-required';
      throw err;
    }
    const credential = EmailAuthProvider.credential(currentUser.email ?? '', password);
    await reauthenticateWithCredential(currentUser, credential);
    return;
  }

  // Compte Google (web : popup ; si la popup échoue — WebView native par
  // exemple — on remonte une erreur claire SANS avoir rien détruit).
  try {
    await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
  } catch (err) {
    logger.warn('Ré-authentification Google impossible', { error: err });
    const friendly = new Error(
      'Reconnecte-toi à ton compte puis relance la suppression (sécurité : connexion récente requise).'
    );
    (friendly as Error & { code: string }).code = 'app/reauth-failed';
    throw friendly;
  }
}

/**
 * Supprime toutes les données Firestore d'un utilisateur (chunké par 450
 * pour tenir la limite de 500 opérations par batch quel que soit le volume).
 */
async function deleteUserFirestoreData(userId: string): Promise<void> {
  const refs: DocumentReference[] = [];
  const collect = (snap: { forEach: (fn: (d: { ref: DocumentReference }) => void) => void }) =>
    snap.forEach((d) => refs.push(d.ref));

  // Sous-collections du compte
  collect(await getDocs(collection(db, 'users', userId, 'userEvents')));
  collect(await getDocs(collection(db, 'users', userId, 'private')));
  collect(await getDocs(collection(db, 'sessions', userId, 'userSessions')));
  collect(await getDocs(collection(db, 'gym_sessions', userId, 'userGymSessions')));
  collect(await getDocs(collection(db, 'userTemplates', userId, 'templates')));

  // Collections racine keyées par champ
  collect(await getDocs(query(collection(db, 'notifications'), where('userId', '==', userId))));
  collect(await getDocs(query(collection(db, 'user_challenges'), where('userId', '==', userId))));
  collect(await getDocs(query(collection(db, 'exercises'), where('userId', '==', userId))));
  collect(await getDocs(query(collection(db, 'friend_requests'), where('fromUserId', '==', userId))));
  collect(await getDocs(query(collection(db, 'friend_requests'), where('toUserId', '==', userId))));

  // Le doc utilisateur en dernier
  refs.push(doc(db, 'users', userId));

  logger.info(`Suppression de ${refs.length} documents Firestore…`);
  await deleteRefsInChunks(refs);
}

/**
 * Supprime le compte utilisateur, dans l'ordre sûr :
 * 1. Ré-authentification (échec possible → rien n'est détruit)
 * 2. Effacement de toutes les données Firestore (chunké)
 * 3. Suppression du compte Firebase Auth
 *
 * @param password requis pour les comptes email/mot de passe
 */
export async function deleteUserAccount(userId: string, password?: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Aucun utilisateur connecté');

  // Étape 1 : ré-auth proactive — AVANT toute destruction
  await reauthenticate(currentUser, password);

  // Étape 2 : données Firestore
  await deleteUserFirestoreData(userId);

  // Étape 3 : compte Auth (la ré-auth vient d'avoir lieu)
  await deleteUser(currentUser);
  logger.info('Compte supprimé');

  // Étape 4 : copie locale (cache persistant Firestore) — Firestore inutilisable ensuite, l'appelant recharge l'appli.
  // Pas à la simple déconnexion : les écritures faites hors ligne et pas encore envoyées seraient perdues.
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (error) {
    logger.warn('Cache local non vidé après suppression du compte', { error });
  }
}
