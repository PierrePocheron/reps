import { logger } from '@/utils/logger';

/**
 * Offline helpers: the in-progress renfo session in localStorage, network state, and writes that do not wait
 * for the server. Syncing itself is Firestore's job (persistent cache + pending-writes queue, see config.ts).
 */

// Type pour la session locale (différent de Session car on stocke startTime au lieu de date)
export interface LocalSession {
  startTime: number;
  exercises: Array<{ name: string; emoji: string; reps: number }>;
  duration: number;
  totalReps: number;
  backdate?: { at: number; duration: number } | null; // séance oubliée (#58)
}

const STORAGE_KEYS = {
  CURRENT_SESSION: 'reps_current_session',
  USER_PREFERENCES: 'reps_user_preferences',
} as const;

/**
 * Sauvegarder la session en cours dans localStorage
 */
export function saveCurrentSessionToLocal(session: Partial<LocalSession>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
  } catch (error) {
    logger.error('Erreur lors de la sauvegarde de la session:', error);
  }
}

/**
 * Récupérer la session en cours depuis localStorage
 */
export function getCurrentSessionFromLocal(): Partial<LocalSession> | null {
  try {
    const sessionData = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    return null;
  } catch (error) {
    logger.error('Erreur lors de la récupération de la session:', error);
    return null;
  }
}

/**
 * Supprimer la session en cours du localStorage
 */
export function clearCurrentSessionFromLocal(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, '');
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  } catch (error) {
    logger.error('Erreur lors de la suppression de la session:', error);
  }
}

/**
 * Hors ligne, une écriture Firestore ne se résout qu'au retour du réseau : sans limite, « Terminer » tournait
 * indéfiniment en salle sans réseau. Au-delà de `ms`, on rend la main : le cache persistant garde l'écriture en
 * file (même appli fermée) et l'envoie à la reconnexion ; un refus du serveur à ce moment-là est journalisé.
 */
export function queuedIfOffline<T>(write: Promise<T>, ms = 2500): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    let queued = false;
    const timer = setTimeout(() => { queued = true; resolve(undefined); }, ms);
    write.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => {
        clearTimeout(timer);
        if (queued) logger.error('Écriture refusée à la resynchronisation :', error);
        reject(error);
      },
    );
  });
}

/**
 * Vérifier si l'application est en mode offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Détecter les changements de connexion réseau
 */
export function onNetworkChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Retourner la fonction de nettoyage
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
