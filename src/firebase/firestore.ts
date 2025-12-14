import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { User, Session, Exercise, Notification, MotivationalPhrase, UserStats } from './types';

/**
 * Helpers Firestore pour les opérations CRUD
 */

// ==================== USERS ====================

/**
 * Créer un document utilisateur
 */
export async function createUserDocument(
  uid: string,
  userData: Partial<User>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc: Omit<User, 'uid'> = {
      displayName: userData.displayName || 'Utilisateur',
      email: userData.email || '',
      photoURL: userData.photoURL,
      colorTheme: userData.colorTheme || 'violet',
      totalReps: 0,
      totalSessions: 0,
      badges: [],
      friends: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(userRef, userDoc);
  } catch (error) {
    console.error('Erreur lors de la création du document utilisateur:', error);
    throw error;
  }
}

/**
 * Obtenir un document utilisateur
 */
export async function getUserDocument(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { uid, ...userSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération du document utilisateur:', error);
    throw error;
  }
}

/**
 * Mettre à jour un document utilisateur
 */
export async function updateUserDocument(uid: string, updates: Partial<User>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du document utilisateur:', error);
    throw error;
  }
}

/**
 * Écouter les changements d'un document utilisateur en temps réel
 */
export function subscribeToUser(
  uid: string,
  callback: (user: User | null) => void
): Unsubscribe {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        callback({ uid, ...snap.data() } as User);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Erreur lors de l\'écoute du document utilisateur:', error);
      callback(null);
    }
  );
}

// ==================== SESSIONS ====================

/**
 * Créer une session d'entraînement
 */
export async function createSession(userId: string, sessionData: Omit<Session, 'sessionId' | 'userId' | 'createdAt'>): Promise<string> {
  try {
    const sessionsRef = collection(db, 'sessions', userId, 'userSessions');
    const sessionDoc = {
      ...sessionData,
      userId,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(sessionsRef, sessionDoc);
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la création de la session:', error);
    throw error;
  }
}

/**
 * Obtenir toutes les sessions d'un utilisateur
 */
export async function getUserSessions(userId: string, limitCount = 50): Promise<Session[]> {
  try {
    const sessionsRef = collection(db, 'sessions', userId, 'userSessions');
    const q = query(sessionsRef, orderBy('date', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      sessionId: doc.id,
      ...doc.data(),
    })) as Session[];
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
    throw error;
  }
}

/**
 * Obtenir une session spécifique
 */
export async function getSession(userId: string, sessionId: string): Promise<Session | null> {
  try {
    const sessionRef = doc(db, 'sessions', userId, 'userSessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);

    if (sessionSnap.exists()) {
      return { sessionId, ...sessionSnap.data() } as Session;
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    throw error;
  }
}

/**
 * Écouter les sessions d'un utilisateur en temps réel
 */
export function subscribeToUserSessions(
  userId: string,
  callback: (sessions: Session[]) => void,
  limitCount = 20
): Unsubscribe {
  const sessionsRef = collection(db, 'sessions', userId, 'userSessions');
  const q = query(sessionsRef, orderBy('date', 'desc'), limit(limitCount));

  return onSnapshot(
    q,
    (snapshot) => {
      const sessions = snapshot.docs.map((doc) => ({
        sessionId: doc.id,
        ...doc.data(),
      })) as Session[];
      callback(sessions);
    },
    (error) => {
      console.error('Erreur lors de l\'écoute des sessions:', error);
      callback([]);
    }
  );
}

// ==================== EXERCISES ====================

/**
 * Créer un exercice personnalisé
 */
export async function createExercise(exercise: Omit<Exercise, 'id'>): Promise<string> {
  try {
    const exercisesRef = collection(db, 'exercises');
    const docRef = await addDoc(exercisesRef, {
      ...exercise,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la création de l\'exercice:', error);
    throw error;
  }
}

/**
 * Obtenir les exercices d'un utilisateur (personnalisés)
 */
export async function getUserExercises(userId: string): Promise<Exercise[]> {
  try {
    const exercisesRef = collection(db, 'exercises');
    const q = query(exercisesRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Exercise[];
  } catch (error) {
    console.error('Erreur lors de la récupération des exercices:', error);
    throw error;
  }
}

/**
 * Supprimer un exercice personnalisé
 */
export async function deleteExercise(exerciseId: string): Promise<void> {
  try {
    const exerciseRef = doc(db, 'exercises', exerciseId);
    await deleteDoc(exerciseRef);
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'exercice:', error);
    throw error;
  }
}

// ==================== STATS ====================

/**
 * Calculer les stats d'un utilisateur
 */
export async function calculateUserStats(userId: string): Promise<UserStats> {
  try {
    const sessions = await getUserSessions(userId, 1000); // Récupérer beaucoup de sessions pour les stats

    const totalReps = sessions.reduce((sum, session) => sum + session.totalReps, 0);
    const totalSessions = sessions.length;
    const averageRepsPerSession = totalSessions > 0 ? totalReps / totalSessions : 0;

    // Calculer les streaks (jours consécutifs)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Trier les sessions par date (plus récentes en premier)
    const sortedSessions = [...sessions].sort((a, b) => {
      const dateA = a.date.toDate();
      const dateB = b.date.toDate();
      return dateB.getTime() - dateA.getTime();
    });

    if (sortedSessions.length > 0) {
      const firstSession = sortedSessions[0];
      if (firstSession) {
        const lastSessionDate = firstSession.date.toDate();
        lastSessionDate.setHours(0, 0, 0, 0);

        // Vérifier si la dernière session est aujourd'hui ou hier (pour le streak actuel)
        const daysDiff = Math.floor((today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) {
          currentStreak = 1;
          tempStreak = 1;

          // Continuer le streak
          for (let i = 1; i < sortedSessions.length; i++) {
            const session = sortedSessions[i];
            const prevSession = sortedSessions[i - 1];
            if (session && prevSession) {
              const sessionDate = session.date.toDate();
              sessionDate.setHours(0, 0, 0, 0);
              const prevSessionDate = prevSession.date.toDate();
              prevSessionDate.setHours(0, 0, 0, 0);

              const daysBetween = Math.floor(
                (prevSessionDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              if (daysBetween === 1) {
                tempStreak++;
                if (i === currentStreak) {
                  currentStreak = tempStreak;
                }
                longestStreak = Math.max(longestStreak, tempStreak);
              } else {
                longestStreak = Math.max(longestStreak, tempStreak);
                tempStreak = 1;
              }
            }
          }
        }
      }
    }

    const firstSession = sessions[0];
    return {
      totalReps,
      totalSessions,
      averageRepsPerSession: Math.round(averageRepsPerSession),
      lastSessionDate: firstSession ? firstSession.date : undefined,
      currentStreak,
      longestStreak,
    };
  } catch (error) {
    console.error('Erreur lors du calcul des stats:', error);
    throw error;
  }
}

/**
 * Mettre à jour les stats d'un utilisateur après une session
 */
export async function updateUserStatsAfterSession(userId: string, _sessionTotalReps: number): Promise<void> {
  try {
    const user = await getUserDocument(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const stats = await calculateUserStats(userId);

    await updateUserDocument(userId, {
      totalReps: stats.totalReps,
      totalSessions: stats.totalSessions,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des stats:', error);
    throw error;
  }
}

// ==================== NOTIFICATIONS ====================

/**
 * Créer une notification
 */
export async function createNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<string> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const docRef = await addDoc(notificationsRef, {
      ...notification,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    throw error;
  }
}

/**
 * Obtenir les notifications d'un utilisateur
 */
export async function getUserNotifications(userId: string, limitCount = 50): Promise<Notification[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    throw error;
  }
}

/**
 * Marquer une notification comme lue
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    throw error;
  }
}

// ==================== MOTIVATIONAL PHRASES ====================

/**
 * Obtenir une phrase motivante aléatoire
 */
export async function getRandomMotivationalPhrase(): Promise<MotivationalPhrase | null> {
  try {
    const phrasesRef = collection(db, 'phrases');
    const querySnapshot = await getDocs(phrasesRef);

    if (querySnapshot.empty) {
      return null;
    }

    const phrases = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MotivationalPhrase[];

    // Sélectionner une phrase aléatoire
    const randomIndex = Math.floor(Math.random() * phrases.length);
    const selectedPhrase = phrases[randomIndex];
    return selectedPhrase || null;
  } catch (error) {
    console.error('Erreur lors de la récupération de la phrase motivante:', error);
    return null;
  }
}

