/**
 * Gestion du cache offline avec IndexedDB/localStorage
 * Firestore gère déjà la persistance avec enableIndexedDbPersistence,
 * mais on peut ajouter une couche supplémentaire avec localStorage pour certaines données
 */

// Type pour la session locale (différent de Session car on stocke startTime au lieu de date)
export interface LocalSession {
  startTime: number;
  exercises: Array<{ name: string; emoji: string; reps: number }>;
  duration: number;
  totalReps: number;
  sessionId?: string;
}

const STORAGE_KEYS = {
  CURRENT_SESSION: 'reps_current_session',
  EXERCISES: 'reps_exercises',
  USER_PREFERENCES: 'reps_user_preferences',
} as const;

/**
 * Sauvegarder la session en cours dans localStorage
 */
export function saveCurrentSessionToLocal(session: Partial<LocalSession>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(session));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la session:', error);
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
    console.error('Erreur lors de la récupération de la session:', error);
    return null;
  }
}

/**
 * Supprimer la session en cours du localStorage
 */
export function clearCurrentSessionFromLocal(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
  }
}

/**
 * Sauvegarder les exercices dans localStorage
 */
export function saveExercisesToLocal(exercises: Array<{ id: string; name: string; emoji: string }>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.EXERCISES, JSON.stringify(exercises));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des exercices:', error);
  }
}

/**
 * Récupérer les exercices depuis localStorage
 */
export function getExercisesFromLocal(): Array<{ id: string; name: string; emoji: string }> {
  try {
    const exercisesData = localStorage.getItem(STORAGE_KEYS.EXERCISES);
    if (exercisesData) {
      return JSON.parse(exercisesData);
    }
    return [];
  } catch (error) {
    console.error('Erreur lors de la récupération des exercices:', error);
    return [];
  }
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

/**
 * Synchroniser les données locales avec Firestore quand la connexion est rétablie
 * Cette fonction peut être appelée automatiquement quand on détecte un retour en ligne
 */
export async function syncLocalDataWithFirestore(userId: string): Promise<void> {
  if (isOffline()) {
    console.log('Mode offline, synchronisation reportée');
    return;
  }

  try {
    // Récupérer la session en cours depuis localStorage
    const localSession = getCurrentSessionFromLocal();
    if (localSession && localSession.startTime !== undefined) {
      // Vérifier si la session existe déjà dans Firestore
      const { getSession } = await import('./firestore');
      const sessionId = localSession.sessionId;

      if (sessionId && localSession.startTime !== undefined) {
        const existingSession = await getSession(userId, sessionId);

        if (!existingSession) {
          // Créer la session dans Firestore
          const { createSession } = await import('./firestore');
          const { Timestamp } = await import('firebase/firestore');
          await createSession(userId, {
            date: Timestamp.fromMillis(localSession.startTime),
            duration: localSession.duration || 0,
            exercises: localSession.exercises || [],
            totalReps: localSession.totalReps || 0,
          });

          // Supprimer la session locale après synchronisation
          clearCurrentSessionFromLocal();
        }
      }
    }

    console.log('Synchronisation terminée');
  } catch (error) {
    console.error('Erreur lors de la synchronisation:', error);
  }
}
