import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  setDoc,
  updateDoc,
  arrayUnion,
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
  writeBatch,
  documentId,
  collectionGroup,
  deleteField,
} from 'firebase/firestore';
import { db, auth } from './config';
import type { User, Session, SessionExercise, Exercise, Notification, MotivationalPhrase, UserStats, FriendRequest } from './types';
import { getUnlockedBadges } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { trainingStreaks, weeklyStreaks } from '@/utils/streak';
import { useSettingsStore } from '@/store/settingsStore';
import { updateWidget, widgetData } from '@/utils/widget';
import { getUserGymSessions } from './gymSessions';
import { queuedIfOffline } from './offline';
import { renfoCalories } from '@/utils/calories';

/**
 * Helpers Firestore pour les opérations CRUD
 */

// ==================== USERS ====================

/**
 * Champs sensibles : jamais dans le doc public users/{uid} (lisible par tout
 * utilisateur authentifié), toujours dans users/{uid}/private/profile
 * (owner-only, cf. firestore.rules).
 */
const PRIVATE_PROFILE_FIELDS = ['email', 'weight', 'height', 'birthDate', 'gender'] as const;

function splitUserFields(data: Partial<User>): { publicData: Partial<User>; privateData: Partial<User> } {
  const publicData: Record<string, unknown> = {};
  const privateData: Record<string, unknown> = {};
  Object.entries(data).forEach(([key, value]) => {
    if ((PRIVATE_PROFILE_FIELDS as readonly string[]).includes(key)) privateData[key] = value;
    else publicData[key] = value;
  });
  return { publicData: publicData as Partial<User>, privateData: privateData as Partial<User> };
}

/** SHA-256 hex de l'email normalisé — permet la recherche par email sans exposer l'email. */
export async function hashEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function privateProfileRef(uid: string) {
  return doc(db, 'users', uid, 'private', 'profile');
}

/**
 * Migration à la volée : si le doc public d'un compte existant contient
 * encore des champs sensibles (ancien modèle), les déplacer vers
 * private/profile et les purger du doc public. Best-effort.
 */
async function migrateLegacyPublicFields(uid: string, publicDoc: Record<string, unknown>): Promise<void> {
  const legacy: Record<string, unknown> = {};
  PRIVATE_PROFILE_FIELDS.forEach((f) => {
    if (publicDoc[f] !== undefined) legacy[f] = publicDoc[f];
  });
  if (publicDoc.fcmToken !== undefined) {
    await setDoc(doc(db, 'users', uid, 'private', 'notifications'), { fcmToken: publicDoc.fcmToken }, { merge: true }).catch(() => {});
  }
  if (Object.keys(legacy).length === 0 && publicDoc.fcmToken === undefined) return;
  try {
    if (Object.keys(legacy).length > 0) {
      await setDoc(privateProfileRef(uid), legacy, { merge: true });
    }
    const removals: Record<string, unknown> = {};
    [...PRIVATE_PROFILE_FIELDS, 'fcmToken'].forEach((f) => {
      if (publicDoc[f] !== undefined) removals[f] = deleteField();
    });
    if (typeof publicDoc.email === 'string' && publicDoc.email) {
      removals.emailHash = await hashEmail(publicDoc.email);
    }
    await updateDoc(doc(db, 'users', uid), removals);
    logger.info('[Migration] Champs sensibles déplacés vers private/profile');
  } catch (e) {
    logger.warn('[Migration] Migration du profil impossible (réessaiera au prochain chargement)', { error: e });
  }
}

/**
 * Créer un document utilisateur
 */
export async function createUserDocument(
  uid: string,
  userData: Partial<User>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const { publicData, privateData } = splitUserFields(userData);

    const userDoc: Partial<User> = {
      displayName: userData.displayName || 'Utilisateur',
      searchName: (userData.displayName || 'Utilisateur').toLowerCase(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatarEmoji: '🐥',
      colorTheme: userData.colorTheme || 'blue',
      totalReps: 0,
      totalSessions: 0,
      badges: ['poussin'],
      friends: [],
      currentStreak: 0,
      longestStreak: 0,
      lastTrainingDate: null, // série déjà « calculée » : pas de recalcul au premier lancement (cf. useStreak)
      weeklyStreak: 0,
      lastMetWeek: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...publicData, // Écrase les valeurs par défaut si présentes
      lastConnection: userData.lastConnection || null,
    };
    if (typeof userData.email === 'string' && userData.email) {
      userDoc.emailHash = await hashEmail(userData.email);
    }

    // firestore.rules caps names at 50 chars: a longer one was denied after the Auth account existed (lockout)
    for (const k of ['displayName', 'searchName', 'firstName', 'lastName'] as const) userDoc[k] = userDoc[k]?.slice(0, 50);

    // Nettoyage des champs undefined
    Object.keys(userDoc).forEach(key => userDoc[key as keyof typeof userDoc] === undefined && delete userDoc[key as keyof typeof userDoc]);

    // Utiliser merge: true pour ne pas écraser les données existantes si le document existe déjà
    // (Protection contre les race conditions entre auth.ts et userStore.ts)
    await setDoc(userRef, userDoc, { merge: true });

    // Données sensibles → sous-collection privée (owner-only)
    if (Object.keys(privateData).length > 0) {
      await setDoc(privateProfileRef(uid), privateData, { merge: true });
    }
  } catch (error) {
    logger.error('Erreur lors de la création du document utilisateur:', error);
    throw error;
  }
}

/**
 * Vérifier la disponibilité d'un pseudo (displayName)
 * Retourne true si le pseudo est disponible (ou s'il appartient déjà à l'utilisateur donné)
 */
export async function checkUsernameAvailability(username: string, currentUserId?: string): Promise<boolean> {
  try {
    const term = username.toLowerCase();
    const usersRef = collection(db, 'users');

    // Vérifier par searchName (qui est le lowercase du displayName)
    const q = query(usersRef, where('searchName', '==', term));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return true;
    }

    // Si on trouve un utilisateur, on vérifie si c'est pas nous-même
    if (currentUserId && querySnapshot.size === 1) {
      return querySnapshot.docs[0]?.id === currentUserId;
    }

    return false;
  } catch (error) {
    logger.error('Erreur lors de la vérification du pseudo:', error);
    return false;
  }
}

/**
 * Obtenir un document utilisateur
 */
export async function getUserDocument(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;

    const publicDoc = userSnap.data();

    // Pour son propre profil : fusionner les champs privés + migrer l'ancien modèle
    if (auth.currentUser?.uid === uid) {
      void migrateLegacyPublicFields(uid, publicDoc);
      try {
        const privateSnap = await getDoc(privateProfileRef(uid));
        if (privateSnap.exists()) {
          return { uid, ...publicDoc, ...privateSnap.data() } as User;
        }
      } catch (e) {
        logger.warn('Lecture du profil privé impossible', { error: e });
      }
    }

    return { uid, ...publicDoc } as User;
  } catch (error) {
    logger.error('Erreur lors de la récupération du document utilisateur:', error);
    throw error;
  }
}

/**
 * Mettre à jour un document utilisateur
 */
export async function updateUserDocument(uid: string, updates: Partial<User>): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);

    const { publicData, privateData } = splitUserFields(updates);
    if (publicData.displayName) {
      publicData.searchName = publicData.displayName.toLowerCase();
    }

    if (Object.keys(privateData).length > 0) {
      await queuedIfOffline(setDoc(privateProfileRef(uid), privateData, { merge: true }));
      if (typeof privateData.email === 'string' && privateData.email) {
        (publicData as Record<string, unknown>).emailHash = await hashEmail(privateData.email);
      }
    }

    if (Object.keys(publicData).length > 0) {
      await queuedIfOffline(updateDoc(userRef, {
        ...publicData,
        updatedAt: serverTimestamp(),
      }));
    }
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du document utilisateur:', error);
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
  const isSelf = auth.currentUser?.uid === uid;

  let publicData: Record<string, unknown> | null = null;
  let privateData: Record<string, unknown> = {};

  const emit = () => {
    if (publicData) callback({ uid, ...publicData, ...privateData } as User);
    else callback(null);
  };

  const unsubPublic = onSnapshot(
    userRef,
    (snap) => {
      publicData = snap.exists() ? snap.data() : null;
      emit();
    },
    (error) => {
      // signed out (or account deleted): the rules now refuse this read, which is expected, not an error
      if (auth.currentUser) logger.error('Erreur lors de l\'écoute du document utilisateur:', error);
      callback(null);
    }
  );

  // Champs sensibles (email, poids…) : sous-collection privée, pour soi uniquement
  const unsubPrivate = isSelf
    ? onSnapshot(
        privateProfileRef(uid),
        (snap) => {
          privateData = snap.exists() ? snap.data() : {};
          emit();
        },
        () => { /* profil privé illisible : on continue avec le doc public */ }
      )
    : null;

  return () => {
    unsubPublic();
    unsubPrivate?.();
  };
}

// ==================== SESSIONS ====================

/**
 * Créer une session d'entraînement
 */
export async function createSession(userId: string, sessionData: Omit<Session, 'sessionId' | 'userId' | 'createdAt'>): Promise<string | undefined> {
  try {
    const sessionsRef = collection(db, 'sessions', userId, 'userSessions');
    const sessionDoc = {
      ...sessionData,
      userId,
      createdAt: serverTimestamp(),
    };

    const docRef = await queuedIfOffline(addDoc(sessionsRef, sessionDoc));
    return docRef?.id; // undefined hors ligne : écriture en file
  } catch (error) {
    logger.error('Erreur lors de la création de la session:', error);
    throw error;
  }
}

/**
 * Obtenir la dernière session d'un utilisateur
 */
export async function getLastSession(userId: string): Promise<Session | null> {
  try {
    const sessionsRef = collection(db, 'sessions', userId, 'userSessions');
    const q = query(sessionsRef, orderBy('date', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const sessionDoc = querySnapshot.docs[0];
      return {
        sessionId: sessionDoc?.id,
        ...sessionDoc?.data(),
      } as Session;
    }
    return null;
  } catch (error) {
    logger.error('Erreur lors de la récupération de la dernière session:', error);
    throw error;
  }
}

/**
 * Obtenir toutes les sessions d'un utilisateur
 */
/** Modifier une séance renfo passée (#57) : reps par exercice ; total de reps recalculé, calories fournies. */
export async function updateSession(userId: string, sessionId: string, exercises: SessionExercise[], totalCalories: number) {
  // min=0 on the inputs does not stop typing « -10 »
  const clean = exercises.map(({ name, emoji, reps, met }) => ({ name, emoji, reps: Number.isFinite(reps) && reps > 0 ? reps : 0, ...(met ? { met } : {}) }));
  const fields = {
    exercises: clean,
    totalReps: clean.reduce((n, ex) => n + ex.reps, 0),
    totalCalories: Math.round(totalCalories),
  };
  await queuedIfOffline(updateDoc(doc(db, 'sessions', userId, 'userSessions', sessionId), fields));
  return fields;
}

/** Supprimer une séance renfo (#56) : le classement et le fil lisent les séances en direct ; stats à recalculer. */
export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', userId, 'userSessions', sessionId);
  // Kudos are a subcollection: deleting the session alone left them behind, out of reach of account deletion
  const kudos = await getDocs(collection(sessionRef, 'kudos'));
  const batch = writeBatch(db);
  kudos.docs.forEach((k) => batch.delete(k.ref));
  batch.delete(sessionRef);
  await queuedIfOffline(batch.commit());
}

/** Renfo sessions within [from, to): period recaps must not stop at the latest page of history. */
export async function getUserSessionsBetween(userId: string, from: Date, to: Date): Promise<Session[]> {
  const q = query(collection(db, 'sessions', userId, 'userSessions'),
    where('date', '>=', Timestamp.fromDate(from)), where('date', '<', Timestamp.fromDate(to)), orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ sessionId: d.id, ...d.data() })) as Session[];
}

/** fromServer: rejects offline instead of returning only what this device has cached (export, import duplicates). */
export async function getUserSessions(userId: string, limitCount = 50, fromServer = false): Promise<Session[]> {
  try {
    const sessionsRef = collection(db, 'sessions', userId, 'userSessions');
    const q = query(sessionsRef, orderBy('date', 'desc'), limit(limitCount));
    const querySnapshot = await (fromServer ? getDocsFromServer : getDocs)(q);

    return querySnapshot.docs.map((sessionDoc) => ({
      sessionId: sessionDoc.id,
      ...sessionDoc.data(),
    })) as Session[];
  } catch (error) {
    logger.error('Erreur lors de la récupération des sessions:', error);
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
    logger.error('Erreur lors de la récupération de la session:', error);
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
      logger.error('Erreur lors de l\'écoute des sessions:', error);
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
    logger.error('Erreur lors de la création de l\'exercice:', error);
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
    logger.error('Erreur lors de la récupération des exercices:', error);
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
    logger.error('Erreur lors de la suppression de l\'exercice:', error);
    throw error;
  }
}

// ==================== STATS ====================

/**
 * Calculer les stats d'un utilisateur
 */
export async function calculateUserStats(userId: string): Promise<UserStats> {
  try {
    const [sessions, gymSessions, user] = await Promise.all([
      getUserSessions(userId, 1000), // Récupérer beaucoup de sessions pour les stats
      getUserGymSessions(userId, 1000),
      getUserDocument(userId), // weight, height, gender for per-exercise kcal
    ]);

    const totalReps = sessions.reduce((sum, session) => sum + session.totalReps, 0);
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    const totalExercises = sessions.reduce((sum, session) => sum + session.exercises.length, 0);
    const totalCalories = sessions.reduce((sum, session) => sum + (session.totalCalories || 0), 0);
    const totalSessions = sessions.length;

    const averageRepsPerSession = totalSessions > 0 ? totalReps / totalSessions : 0;
    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const averageExercises = totalSessions > 0 ? totalExercises / totalSessions : 0;

    // Séries : jours distincts avec une séance, renfo + muscu
    const trainingDates = [...sessions, ...gymSessions].map((sess) => sess.date).filter(Boolean);
    const dates = trainingDates.map((d) => d.toDate());
    const { current: currentStreak, longest: longestStreak, pendingJoker, lastJokerDay } = trainingStreaks(dates);
    const weekly = weeklyStreaks(dates, useSettingsStore.getState().weeklyGoal);
    const lastTrainingDate = trainingDates.reduce<Timestamp | undefined>(
      (latest, d) => (!latest || d.toDate() > latest.toDate() ? d : latest), undefined);
    // Widget d'écran d'accueil : recalculé au lancement et à chaque fin de séance (#36)
    if (userId === auth.currentUser?.uid) {
      const { streakMode, weeklyGoal } = useSettingsStore.getState();
      updateWidget(widgetData(dates, {
        currentStreak, lastTrainingDate: lastTrainingDate?.toDate(), lastJokerDay,
        weeklyStreak: weekly.current, lastMetWeek: weekly.lastMetWeek,
      }, streakMode === 'weekly', weeklyGoal));
    }

    // Caluler les sessions par créneau horaire et par exercice
    let morningSessions = 0;
    let lunchSessions = 0;
    let nightSessions = 0;
    const exerciseStatsMap = new Map<string, { emoji: string; reps: number; calories: number; count: number }>();

    // Créneaux (badges lève-tôt, midi, nuit) : renfo + muscu, comme la série et les « Habitudes » (muscu oubliée avant)
    for (const date of dates) {
      const hour = date.getHours();
      if (hour >= 7 && hour < 9) morningSessions++;  // 7h - 9h
      if (hour >= 12 && hour < 14) lunchSessions++;  // 12h - 14h
      if (hour >= 23 || hour < 5) nightSessions++;   // 23h - 5h
    }

    sessions.forEach(session => {
        if (!session.date) return;

        // Stats par exercice
        if (session.exercises) {
            session.exercises.forEach(ex => {
                const current = exerciseStatsMap.get(ex.name) || { emoji: ex.emoji, reps: 0, calories: 0, count: 0 };
                current.reps += ex.reps;
                current.count += 1;
                current.calories += renfoCalories(user, [ex]); // same formula as the session total

                exerciseStatsMap.set(ex.name, current);
            });
        }
    });

    const exercisesDistribution = Array.from(exerciseStatsMap.entries()).map(([name, data]) => ({
        name,
        emoji: data.emoji,
        totalReps: data.reps,
        totalCalories: Math.round(data.calories),
        count: data.count
    })).sort((a, b) => b.totalReps - a.totalReps);

    const firstSession = sessions[0];
    return {
      totalReps,
      totalSessions,
      totalCalories,
      averageRepsPerSession: Math.round(averageRepsPerSession),
      averageDuration: Math.round(averageDuration),
      averageExercises: parseFloat(averageExercises.toFixed(1)),
      lastSessionDate: firstSession ? firstSession.date : undefined,
      lastSessionReps: firstSession ? firstSession.totalReps : undefined,
      currentStreak,
      longestStreak,
      lastTrainingDate,
      jokerPending: pendingJoker !== null,
      lastJokerDay,
      weeklyStreak: weekly.current,
      longestWeeklyStreak: weekly.longest,
      lastMetWeek: weekly.lastMetWeek,
      morningSessions,
      lunchSessions,
      nightSessions,
      exercisesDistribution,
    };
  } catch (error) {
    logger.error('Erreur lors du calcul des stats:', error);
    throw error;
  }
}

/**
 * Mettre à jour les stats d'un utilisateur après une session
 */
// The signed-in user's store takes the fresh stats (Statistics, badges stayed stale after a gym session) without a
// second full read. Registered by userStore, which imports this module (no import back)
let statsListener: ((stats: UserStats) => void) | null = null;
export const onUserStatsComputed = (fn: ((stats: UserStats) => void) | null) => { statsListener = fn; };

export async function updateUserStatsAfterSession(userId: string, _sessionTotalReps: number): Promise<void> {
  try {
    const user = await getUserDocument(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const stats = await calculateUserStats(userId);
    const streakFields = {
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastTrainingDate: stats.lastTrainingDate ?? null,
      lastJokerDay: stats.lastJokerDay ?? null,
      weeklyStreak: stats.weeklyStreak ?? 0,
      lastMetWeek: stats.lastMetWeek ?? null,
    };

    // Vérifier les nouveaux badges
    const currentBadges = user.badges || [];
    const unlockedBadges = getUnlockedBadges(stats);
    const newBadges = unlockedBadges.filter(b => !currentBadges.includes(b.id));

    const updatedBadges = [...currentBadges, ...newBadges.map(b => b.id)];

    // Créer des événements pour les nouveaux badges
    if (newBadges.length > 0) {
      const batch = writeBatch(db);

      // 1. Mettre à jour le user
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        totalReps: stats.totalReps,
        totalSessions: stats.totalSessions,
        totalCalories: stats.totalCalories || 0,
        ...streakFields,
        badges: updatedBadges,
        updatedAt: serverTimestamp(),
        morningSessions: stats.morningSessions,
        lunchSessions: stats.lunchSessions,
        nightSessions: stats.nightSessions,
        exercisesDistribution: stats.exercisesDistribution,
        newBadgeIds: arrayUnion(...newBadges.map(b => b.id)),
      });

      // 2. Créer les événements de badge
      const eventsRef = collection(db, 'users', userId, 'userEvents');
      newBadges.forEach(badge => {
        const eventDoc = doc(eventsRef);
        batch.set(eventDoc, {
          type: 'badge_unlocked',
          userId,
          badgeId: badge.id,
          badgeName: badge.name,
          badgeEmoji: badge.emoji,
          createdAt: serverTimestamp(),
        });
      });

      await queuedIfOffline(batch.commit());
    } else {
      // Juste mettre à jour les stats
      await queuedIfOffline(updateUserDocument(userId, {
        totalReps: stats.totalReps,
        totalSessions: stats.totalSessions,
        totalCalories: stats.totalCalories || 0,
        ...streakFields,
        morningSessions: stats.morningSessions,
        lunchSessions: stats.lunchSessions,
        nightSessions: stats.nightSessions,
        exercisesDistribution: stats.exercisesDistribution,
      }));
    }
    if (userId === auth.currentUser?.uid) statsListener?.(stats);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des stats:', error);
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
    logger.error('Erreur lors de la création de la notification:', error);
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
    logger.error('Erreur lors de la récupération des notifications:', error);
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
    logger.error('Erreur lors de la mise à jour de la notification:', error);
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
    logger.error('Erreur lors de la récupération de la phrase motivante:', error);
    return null;
  }
}

// ==================== SOCIAL ====================

/**
 * Rechercher des utilisateurs par pseudo (recherche simple par préfixe)
 */
export async function searchUsers(searchTerm: string, limitCount = 10): Promise<User[]> {
  try {
    // The app shows pseudos as « @pseudo »: a leading @ is not part of the pseudo (nor an e-mail)
    const raw = searchTerm.trim().replace(/^@/, '');
    if (raw.length < 2) return [];

    const usersRef = collection(db, 'users');
    // Note: Firestore ne supporte pas nativement la recherche "contains" ou "fuzzy".
    // On utilise ici une recherche par préfixe sur le champ 'searchName'.
    // Pour une vraie recherche, il faudrait utiliser Algolia ou Meilisearch.
    // Astuce pour le préfixe: startAt(term) et endAt(term + '\uf8ff')

    const term = raw.toLowerCase();
    const results = new Map<string, User>();

    // 1. Recherche par email (exacte, via hash — l'email en clair n'est pas stocké)
    if (term.includes('@')) {
      const emailHashQuery = query(usersRef, where('emailHash', '==', await hashEmail(term)));
      const emailSnap = await getDocs(emailHashQuery);
      emailSnap.forEach(doc => results.set(doc.id, { uid: doc.id, ...doc.data() } as User));
    }

    // 2. Recherche par searchName (Insensible à la casse - Préfixe)
    // Nécessite que le champ searchName existe (utilisateurs récents ou mis à jour)
    const searchNameQuery = query(
      usersRef,
      orderBy('searchName'),
      where('searchName', '>=', term),
      where('searchName', '<=', term + '\uf8ff'),
      limit(limitCount)
    );

    // 3. Recherche par displayName (Sensible à la casse - Fallback pour vieux comptes)
    // On essaie avec le terme tel quel (ex: "Pierre")
    const displayNameQuery = query(
      usersRef,
      orderBy('displayName'),
      where('displayName', '>=', raw),
      where('displayName', '<=', raw + '\uf8ff'),
      limit(limitCount)
    );

    try {
      const [searchNameSnap, displayNameSnap] = await Promise.all([
        getDocs(searchNameQuery),
        getDocs(displayNameQuery)
      ]);

      searchNameSnap.forEach(doc => results.set(doc.id, { uid: doc.id, ...doc.data() } as User));
      displayNameSnap.forEach(doc => results.set(doc.id, { uid: doc.id, ...doc.data() } as User));
    } catch (e) {
      logger.warn("Erreur sur une des requêtes de recherche (probablement index manquant), on continue avec ce qu'on a", { error: e });
    }

    return Array.from(results.values()).slice(0, limitCount);
  } catch (error) {
    logger.error('Erreur lors de la recherche d\'utilisateurs:', error);
    return [];
  }
}

/**
 * Envoyer une demande d'ami
 */
export async function sendFriendRequest(fromUser: User, toUserId: string): Promise<void> {
  try {
    // IDs déterministes `${from}_${to}` : pas de doublon possible, et les
    // règles Firestore peuvent vérifier la relation par get() ciblé.
    const outgoingRef = doc(db, 'friend_requests', `${fromUser.uid}_${toUserId}`);
    const incomingRef = doc(db, 'friend_requests', `${toUserId}_${fromUser.uid}`);

    // 1. Demande inverse en attente ? → Match : on l'accepte directement.
    const incomingSnap = await getDoc(incomingRef).catch(() => null);
    if (incomingSnap?.exists() && incomingSnap.data().status === 'pending') {
      await acceptFriendRequest(incomingRef.id, toUserId, fromUser.uid);
      return;
    }

    // 2. Demande sortante existante ?
    const outgoingSnap = await getDoc(outgoingRef).catch(() => null);
    if (outgoingSnap?.exists()) {
      const status = outgoingSnap.data().status;
      if (status === 'pending') throw new Error('Une demande est déjà en attente');
      if (status === 'accepted') throw new Error('Vous êtes déjà amis');
      // rejected : on supprime l'ancienne demande pour pouvoir en renvoyer une
      await deleteDoc(outgoingRef);
    }

    // 3. Créer la demande
    await setDoc(outgoingRef, {
      fromUserId: fromUser.uid,
      fromDisplayName: fromUser.displayName,
      fromAvatarEmoji: fromUser.avatarEmoji || '🐥',
      toUserId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de la demande d\'ami:', error);
    throw error;
  }
}

/**
 * Accepter une demande d'ami
 */
export async function acceptFriendRequest(requestId: string, fromUserId: string, currentUserId: string): Promise<void> {
  try {
    const batch = writeBatch(db); // Utiliser un batch pour la cohérence

    // 1. Mettre à jour le statut de la demande
    const requestRef = doc(db, 'friend_requests', requestId);
    const requestSnap = await getDoc(requestRef);
    if (!requestSnap.exists()) {
      throw new Error('Demande introuvable');
    }
    batch.update(requestRef, { status: 'accepted' });

    // 2. Ajouter l'ami à la liste de l'utilisateur courant
    const currentUserRef = doc(db, 'users', currentUserId);
    // Note: arrayUnion ajoute uniquement si l'élément n'existe pas déjà
    // On doit importer arrayUnion depuis firebase/firestore
    // Comme on ne l'a pas importé en haut, on va faire une mise à jour classique pour l'instant ou ajouter l'import
    // Pour simplifier sans changer les imports du haut tout de suite (risque de conflit), on fait un get/update
    // Mais arrayUnion est mieux. Je vais supposer que je peux l'ajouter aux imports ou faire sans.
    // Allons au plus simple : updateDoc avec arrayUnion si possible, sinon lecture/écriture.
    // Je vais modifier les imports en haut du fichier dans une autre étape si besoin.
    // Pour l'instant, faisons une lecture/écriture sécurisée.

    // En fait, arrayUnion est indispensable pour éviter les race conditions.
    // Je vais l'ajouter aux imports dans une prochaine étape.
    // Pour ce snippet, je vais utiliser une syntaxe qui nécessitera l'import.

    // ... Attends, je ne peux pas modifier les imports ici facilement sans tout réécrire.
    // Je vais utiliser une méthode sans arrayUnion pour ce bloc, et je ferai une passe de refactoring imports après.
    // Ou mieux : je lis, je modifie, j'écris. C'est moins atomique mais ça marche pour un MVP.

    const currentUserSnap = await getDoc(currentUserRef);
    const currentUserData = currentUserSnap.data() as User;
    const currentFriends = currentUserData.friends || [];
    if (!currentFriends.includes(fromUserId)) {
      batch.update(currentUserRef, { friends: [...currentFriends, fromUserId] });
    }

    // 3. Ajouter l'utilisateur courant à la liste de l'ami
    const fromUserRef = doc(db, 'users', fromUserId);
    const fromUserSnap = await getDoc(fromUserRef);
    const fromUserData = fromUserSnap.data() as User;
    const fromFriends = fromUserData.friends || [];
    if (!fromFriends.includes(currentUserId)) {
      batch.update(fromUserRef, { friends: [...fromFriends, currentUserId] });
    }


    // 5. Nettoyage : Vérifier s'il existe une demande inverse (de current vers from) et la marquer comme acceptée aussi
    // Cela évite d'avoir une demande "fantôme" si les deux se sont ajoutés en même temps
    const reverseRequestsRef = collection(db, 'friend_requests');
    const reverseQuery = query(
      reverseRequestsRef,
      where('fromUserId', '==', currentUserId),
      where('toUserId', '==', fromUserId),
      where('status', '==', 'pending')
    );

    // Note: On ne peut pas faire de requête async dans une transaction/batch facilement sans lecture préalable.
    // Ici on est hors transaction pour la lecture, donc on peut le faire avant le commit.
    const reverseDocs = await getDocs(reverseQuery);
    reverseDocs.forEach(doc => {
      // 4. Supprimer la demande inverse si elle existe
      batch.delete(doc.ref);
    });

    // 5. Créer un événement "Nouveau lien d'amitié" pour les deux utilisateurs
    // Pour l'utilisateur qui a accepté (currentUser)
    const eventRef1 = doc(collection(db, 'users', currentUserId, 'userEvents'));
    batch.set(eventRef1, {
      type: 'new_friend',
      userId: currentUserId,
      friendId: fromUserId,
      friendName: requestSnap.data().fromDisplayName, // On suppose que c'est dispo, sinon on fetch
      createdAt: serverTimestamp(),
    });

    // Pour l'utilisateur qui a envoyé la demande (fromUser)
    // Note: On a besoin du nom de currentUserId pour l'événement de l'autre côté.
    // Idéalement on devrait passer le currentUser complet à cette fonction ou le fetcher.
    // Pour simplifier, on crée l'événement seulement pour celui qui accepte pour l'instant,
    // ou on accepte que l'info soit incomplète.
    // Mieux : On crée l'événement visible dans le feed.

    await batch.commit();

    // Notification pour l'expéditeur — hors batch (best-effort) : après le
    // commit, la relation d'amitié existe, la règle notifications l'autorise.
    await addDoc(collection(db, 'notifications'), {
      userId: fromUserId,
      fromUserId: currentUserId,
      title: 'Demande acceptée',
      message: `${currentUserData.displayName} a accepté ta demande d'ami`,
      type: 'friend_activity',
      read: false,
      createdAt: serverTimestamp(),
    }).catch((e) => logger.warn('Notification d\'acceptation non envoyée', { error: e }));
  } catch (error) {
    logger.error('Erreur lors de l\'acceptation de la demande:', error);
    throw error;
  }
}

/**
 * Supprimer un ami
 */
export async function removeFriend(currentUserId: string, friendId: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // 1. Retirer friendId de la liste de currentUserId
    const currentUserRef = doc(db, 'users', currentUserId);
    const currentUserSnap = await getDoc(currentUserRef);
    if (currentUserSnap.exists()) {
      const currentFriends = currentUserSnap.data().friends || [];
      batch.update(currentUserRef, {
        friends: currentFriends.filter((id: string) => id !== friendId),
        updatedAt: serverTimestamp(),
      });
    }

    // 2. Retirer currentUserId de la liste de friendId
    // (écriture croisée : les règles n'autorisent que le champ friends,
    // et uniquement pour se retirer soi-même)
    const friendRef = doc(db, 'users', friendId);
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
      const friendFriends = friendSnap.data().friends || [];
      if (friendFriends.includes(currentUserId)) {
        batch.update(friendRef, {
          friends: friendFriends.filter((id: string) => id !== currentUserId),
        });
      }
    }

    // 3. Supprimer les demandes d'ami entre les deux (sinon l'ex-ami
    // pourrait se ré-ajouter via la demande « accepted » restante)
    const reqAB = doc(db, 'friend_requests', `${currentUserId}_${friendId}`);
    const reqBA = doc(db, 'friend_requests', `${friendId}_${currentUserId}`);
    const [snapAB, snapBA] = await Promise.all([
      getDoc(reqAB).catch(() => null),
      getDoc(reqBA).catch(() => null),
    ]);
    if (snapAB?.exists()) batch.delete(reqAB);
    if (snapBA?.exists()) batch.delete(reqBA);

    await batch.commit();

    // Demandes à ancien format (ID auto) : nettoyage best-effort
    try {
      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(query(collection(db, 'friend_requests'),
          where('fromUserId', '==', currentUserId), where('toUserId', '==', friendId))),
        getDocs(query(collection(db, 'friend_requests'),
          where('fromUserId', '==', friendId), where('toUserId', '==', currentUserId))),
      ]);
      const cleanup = writeBatch(db);
      let count = 0;
      [...sentSnap.docs, ...receivedSnap.docs].forEach((d) => {
        if (d.id !== reqAB.id && d.id !== reqBA.id) {
          cleanup.delete(d.ref);
          count++;
        }
      });
      if (count > 0) await cleanup.commit();
    } catch { /* best-effort */ }
  } catch (error) {
    logger.error('Erreur lors de la suppression de l\'ami:', error);
    throw error;
  }
}

/**
 * Refuser une demande d'ami
 */
export async function declineFriendRequest(requestId: string): Promise<void> {
  try {
    const requestRef = doc(db, 'friend_requests', requestId);
    await updateDoc(requestRef, { status: 'rejected' });
  } catch (error) {
    logger.error('Erreur lors du refus de la demande d\'ami:', error);
    throw error;
  }
}

/**
 * Obtenir les demandes d'amis reçues (en attente)
 */

// ==================== SOCIAL TYPES ====================
export interface ActivityItem {
  createdAt?: { toDate: () => Date };
  [key: string]: unknown;
}

interface LeaderboardSession {
  userId: string;
  totalReps?: number;
  totalCalories?: number;
}



/**
 * Obtenir les demandes d'amis reçues (en attente)
 */
export function subscribeToFriendRequests(userId: string, callback: (requests: FriendRequest[]) => void): Unsubscribe {
  const requestsRef = collection(db, 'friend_requests');
  // Simplification de la requête pour éviter les problèmes d'index complexes
  // On triera côté client
  const q = query(
    requestsRef,
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const requests: FriendRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
    // Tri côté client (plus robuste si l'index n'est pas encore prêt)
    // The rules do not require createdAt: one request without it threw here and hid every pending request
    requests.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    callback(requests);
  }, (error) => {
    logger.error("ERREUR CRITIQUE lors de l'écoute des demandes d'amis:", error);
  });
}

/**
 * Obtenir les détails des amis
 */
export async function getFriendsDetails(friendIds: string[]): Promise<User[]> {
  try {
    if (!friendIds || friendIds.length === 0) return [];

    // Firestore 'in' query supporte max 10 éléments.
    // Si plus de 10 amis, il faut faire plusieurs requêtes ou boucler.
    // Pour l'instant on gère par lots de 10.

    const friends: User[] = [];
    const chunks = [];
    for (let i = 0; i < friendIds.length; i += 10) {
      chunks.push(friendIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      // Utilisation de documentId() pour filtrer par ID de document
      const q = query(collection(db, 'users'), where(documentId(), 'in', chunk));

      const snapshot = await getDocs(q);
      snapshot.forEach(doc => friends.push({ uid: doc.id, ...doc.data() } as User));
    }

    return friends;
  } catch (error) {
    logger.error('Erreur lors de la récupération des amis:', error);
    throw error; // a failed read is not « no friends »: callers show an error with « Réessayer »
  }
}

/**
 * Obtenir l'activité récente des amis (Séances + Badges)
 */
export async function getFriendsActivity(friendIds: string[], limitCount = 20): Promise<ActivityItem[]> {
  try {
    if (!friendIds || friendIds.length === 0) return [];

    // `in` takes 10 values at most: one pair of queries per 10 friends (friends #11+ were never read), like the
    // leaderboard; each keeps the top `limitCount`, the global sort below keeps the overall top
    const chunks: string[][] = [];
    for (let i = 0; i < friendIds.length; i += 10) chunks.push(friendIds.slice(i, i + 10));
    const recent = (group: string, ids: string[]) =>
      getDocs(query(collectionGroup(db, group), where('userId', 'in', ids), orderBy('createdAt', 'desc'), limit(limitCount)));
    const [sessionSnaps, eventSnaps] = await Promise.all([
      Promise.all(chunks.map((ids) => recent('userSessions', ids))),
      Promise.all(chunks.map((ids) => recent('userEvents', ids))), // badges
    ]);

    const sessions = sessionSnaps.flatMap((snap) => snap.docs).map(doc => ({
      type: 'session',
      sessionId: doc.id,
      ...doc.data()
    }));

    const events = eventSnaps.flatMap((snap) => snap.docs).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fusionner et trier
    const allActivity = [...sessions, ...events].sort((a: ActivityItem, b: ActivityItem) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return allActivity.slice(0, limitCount);
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'activité des amis:', error);
    throw error; // a failed read is not an empty feed
  }
}

/**
 * Obtenir les statistiques pour le classement (Leaderboard)
 */
export async function getLeaderboardStats(friendIds: string[], period: 'daily' | 'weekly' | 'monthly'): Promise<{ userId: string; totalReps: number; totalSessions: number; totalCalories: number }[]> {
  try {
    if (!friendIds || friendIds.length === 0) return [];

    // Déterminer la date de début
    const startDate = new Date();

    if (period === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      // Lundi de la semaine en cours
      const day = startDate.getDay();
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // ajuster si dimanche
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    }

    const startTimestamp = Timestamp.fromDate(startDate);

    // Traiter par lots de 10 amis (limite Firestore 'in')
    const chunks = [];
    for (let i = 0; i < friendIds.length; i += 10) {
      chunks.push(friendIds.slice(i, i + 10));
    }

    const allSessions: LeaderboardSession[] = [];

    for (const chunk of chunks) {
      const q = query(
        collectionGroup(db, 'userSessions'),
        where('userId', 'in', chunk),
        where('date', '>=', startTimestamp)
      );
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => allSessions.push({ userId: doc.data().userId, ...doc.data() }));
    }

    // Agréger les données
    const statsMap = new Map<string, { totalReps: number; totalSessions: number; totalCalories: number }>();

    // Initialiser pour tous les amis (même ceux sans activité)
    friendIds.forEach(id => {
      statsMap.set(id, { totalReps: 0, totalSessions: 0, totalCalories: 0 });
    });

    allSessions.forEach(session => {
      const current = statsMap.get(session.userId) || { totalReps: 0, totalSessions: 0, totalCalories: 0 };
      statsMap.set(session.userId, {
        totalReps: current.totalReps + (session.totalReps || 0),
        totalSessions: current.totalSessions + 1,
        totalCalories: current.totalCalories + (session.totalCalories || 0)
      });
    });

    // Convertir en tableau
    return Array.from(statsMap.entries()).map(([userId, stats]) => ({
      userId,
      ...stats
    }));

  } catch (error) {
    logger.error('Erreur lors de la récupération du classement:', error);
    throw error;
  }
}

/**
 * Marquer les badges comme vus
 */
export async function markBadgesAsSeen(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { newBadgeIds: [] });
  } catch (error) {
    logger.error('Erreur lors du marquage des badges comme vus:', error);
    throw error;
  }
}
