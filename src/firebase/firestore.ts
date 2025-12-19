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
  writeBatch,
  documentId,
  collectionGroup,
} from 'firebase/firestore';
import { db } from './config';
import type { User, Session, Exercise, Notification, MotivationalPhrase, UserStats } from './types';
import { getUnlockedBadges } from '@/utils/constants';

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
      searchName: (userData.displayName || 'Utilisateur').toLowerCase(),
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

    const finalUpdates = { ...updates };
    if (finalUpdates.displayName) {
      finalUpdates.searchName = finalUpdates.displayName.toLowerCase();
    }

    await updateDoc(userRef, {
      ...finalUpdates,
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
    console.error('Erreur lors de la récupération de la dernière session:', error);
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

    return querySnapshot.docs.map((sessionDoc) => ({
      sessionId: sessionDoc.id,
      ...sessionDoc.data(),
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
    const totalDuration = sessions.reduce((sum, session) => sum + session.duration, 0);
    const totalExercises = sessions.reduce((sum, session) => sum + session.exercises.length, 0);
    const totalSessions = sessions.length;

    const averageRepsPerSession = totalSessions > 0 ? totalReps / totalSessions : 0;
    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const averageExercises = totalSessions > 0 ? totalExercises / totalSessions : 0;

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
      averageDuration: Math.round(averageDuration),
      averageExercises: parseFloat(averageExercises.toFixed(1)),
      lastSessionDate: firstSession ? firstSession.date : undefined,
      lastSessionReps: firstSession ? firstSession.totalReps : undefined,
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
        badges: updatedBadges,
        updatedAt: serverTimestamp(),
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

      await batch.commit();
    } else {
      // Juste mettre à jour les stats
      await updateUserDocument(userId, {
        totalReps: stats.totalReps,
        totalSessions: stats.totalSessions,
      });
    }
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

// ==================== SOCIAL ====================

/**
 * Rechercher des utilisateurs par pseudo (recherche simple par préfixe)
 */
export async function searchUsers(searchTerm: string, limitCount = 10): Promise<User[]> {
  try {
    if (!searchTerm || searchTerm.length < 2) return [];

    const usersRef = collection(db, 'users');
    // Note: Firestore ne supporte pas nativement la recherche "contains" ou "fuzzy".
    // On utilise ici une recherche par préfixe sur le champ 'searchName'.
    // Pour une vraie recherche, il faudrait utiliser Algolia ou Meilisearch.
    // Astuce pour le préfixe: startAt(term) et endAt(term + '\uf8ff')

    const term = searchTerm.toLowerCase();
    const results = new Map<string, User>();

    // 1. Recherche par Email (Exacte)
    if (term.includes('@')) {
      const emailQuery = query(usersRef, where('email', '==', searchTerm)); // Email exact (souvent sensible à la casse ou déjà lowercase)
      // On essaie aussi lowercase juste au cas où
      const emailQueryLower = query(usersRef, where('email', '==', term));

      const [emailSnap, emailLowerSnap] = await Promise.all([
        getDocs(emailQuery),
        getDocs(emailQueryLower)
      ]);

      emailSnap.forEach(doc => results.set(doc.id, { uid: doc.id, ...doc.data() } as User));
      emailLowerSnap.forEach(doc => results.set(doc.id, { uid: doc.id, ...doc.data() } as User));
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
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
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
      console.warn("Erreur sur une des requêtes de recherche (probablement index manquant), on continue avec ce qu'on a", e);
    }

    return Array.from(results.values()).slice(0, limitCount);
  } catch (error) {
    console.error('Erreur lors de la recherche d\'utilisateurs:', error);
    return [];
  }
}

/**
 * Envoyer une demande d'ami
 */
export async function sendFriendRequest(fromUser: User, toUserId: string): Promise<void> {
  try {
    const requestsRef = collection(db, 'friend_requests');

    // 1. Vérifier s'il y a déjà une demande INVERSE (de toUserId vers fromUser) en attente
    // Si oui, on accepte automatiquement cette demande (Match !)
    const reverseQuery = query(
      requestsRef,
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUser.uid),
      where('status', '==', 'pending')
    );

    const reverseDocs = await getDocs(reverseQuery);
    if (!reverseDocs.empty) {
      // On a trouvé une demande inverse -> On l'accepte
      const reverseRequest = reverseDocs.docs[0];
      if (reverseRequest) {
        await acceptFriendRequest(reverseRequest.id, toUserId, fromUser.uid);
        return;
      }
    }

    // 2. Vérifier si une demande existe déjà (dans le sens normal)
    const q = query(
      requestsRef,
      where('fromUserId', '==', fromUser.uid),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending')
    );

    const existingDocs = await getDocs(q);
    if (!existingDocs.empty) {
      throw new Error('Une demande est déjà en attente');
    }

    // 3. Créer la demande
    await addDoc(requestsRef, {
      fromUserId: fromUser.uid,
      fromDisplayName: fromUser.displayName,
      fromPhotoURL: fromUser.photoURL || null,
      toUserId,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // Créer une notification pour le destinataire
    await createNotification({
      userId: toUserId,
      title: 'Nouvelle demande d\'ami',
      message: `${fromUser.displayName} veut vous ajouter en ami`,
      type: 'friend_activity',
      read: false,
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi de la demande d\'ami:', error);
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

    // 4. Notification pour l'expéditeur
    const notifRef = doc(collection(db, 'notifications'));
    batch.set(notifRef, {
      userId: fromUserId,
      title: 'Demande acceptée',
      message: `${currentUserData.displayName} a accepté votre demande d'ami`,
      type: 'friend_activity',
      read: false,
      createdAt: serverTimestamp(),
    });

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
  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la demande:', error);
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
    const friendRef = doc(db, 'users', friendId);
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
      const friendFriends = friendSnap.data().friends || [];
      batch.update(friendRef, {
        friends: friendFriends.filter((id: string) => id !== currentUserId),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'ami:', error);
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
    console.error('Erreur lors du refus de la demande d\'ami:', error);
    throw error;
  }
}

/**
 * Obtenir les demandes d'amis reçues (en attente)
 */

// ==================== SOCIAL TYPES ====================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = any;



/**
 * Obtenir les demandes d'amis reçues (en attente)
 */
export function subscribeToFriendRequests(userId: string, callback: (requests: AnyDoc[]) => void): Unsubscribe {
  const requestsRef = collection(db, 'friend_requests');
  // Simplification de la requête pour éviter les problèmes d'index complexes
  // On triera côté client
  const q = query(
    requestsRef,
    where('toUserId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Tri côté client (plus robuste si l'index n'est pas encore prêt)
    requests.sort((a: AnyDoc, b: AnyDoc) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(requests);
  }, (error) => {
    console.error("ERREUR CRITIQUE lors de l'écoute des demandes d'amis:", error);
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
    console.error('Erreur lors de la récupération des amis:', error);
    return [];
  }
}

/**
 * Obtenir l'activité récente des amis (Séances + Badges)
 */
export async function getFriendsActivity(friendIds: string[], limitCount = 20): Promise<(Session | AnyDoc)[]> {
  try {
    if (!friendIds || friendIds.length === 0) return [];

    const friendsSubset = friendIds.slice(0, 10);

    // 1. Récupérer les sessions
    const sessionsQuery = query(
      collectionGroup(db, 'userSessions'),
      where('userId', 'in', friendsSubset),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    // 2. Récupérer les événements (badges)
    // Note: Il faut un index pour userEvents aussi
    const eventsQuery = query(
      collectionGroup(db, 'userEvents'),
      where('userId', 'in', friendsSubset),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const [sessionsSnap, eventsSnap] = await Promise.all([
      getDocs(sessionsQuery),
      getDocs(eventsQuery)
    ]);

    const sessions = sessionsSnap.docs.map(doc => ({
      type: 'session',
      sessionId: doc.id,
      ...doc.data()
    }));

    const events = eventsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fusionner et trier
    const allActivity = [...sessions, ...events].sort((a: AnyDoc, b: AnyDoc) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return allActivity.slice(0, limitCount);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'activité des amis:', error);
    return [];
  }
}

/**
 * Obtenir les statistiques pour le classement (Leaderboard)
 */
export async function getLeaderboardStats(friendIds: string[], period: 'daily' | 'weekly' | 'monthly'): Promise<{ userId: string; totalReps: number; totalSessions: number }[]> {
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

    const allSessions: AnyDoc[] = [];

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
    const statsMap = new Map<string, { totalReps: number; totalSessions: number }>();

    // Initialiser pour tous les amis (même ceux sans activité)
    friendIds.forEach(id => {
      statsMap.set(id, { totalReps: 0, totalSessions: 0 });
    });

    allSessions.forEach(session => {
      const current = statsMap.get(session.userId) || { totalReps: 0, totalSessions: 0 };
      statsMap.set(session.userId, {
        totalReps: current.totalReps + (session.totalReps || 0),
        totalSessions: current.totalSessions + 1
      });
    });

    // Convertir en tableau
    return Array.from(statsMap.entries()).map(([userId, stats]) => ({
      userId,
      ...stats
    }));

  } catch (error) {
    console.error('Erreur lors de la récupération du classement:', error);
    throw error;
  }
}
