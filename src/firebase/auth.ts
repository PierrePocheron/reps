import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider, // Pour Apple
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth } from './config';
import { createUserDocument, getUserDocument } from './firestore';
import type { User } from './types';

/**
 * Helpers pour l'authentification Firebase
 */

// Provider Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Provider Apple
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

/**
 * Connexion avec email et mot de passe
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userDoc = await getUserDocument(user.uid);
    if (!userDoc) {
      // Créer le document utilisateur s'il n'existe pas
      await createUserDocument(user.uid, {
        displayName: user.displayName || 'Utilisateur',
        email: user.email || email,
        photoURL: user.photoURL || undefined,
      });
    }

    return user;
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    throw error;
  }
}

/**
 * Inscription avec email et mot de passe
 */
/**
 * Inscription avec email et mot de passe
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<FirebaseUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const displayName = `${firstName} ${lastName}`.trim();

    // Mise à jour du profil avec le nom d'affichage
    await updateProfile(user, { displayName });

    // Création du document utilisateur dans Firestore
    await createUserDocument(user.uid, {
      displayName,
      firstName,
      lastName,
      email: user.email || email,
      photoURL: user.photoURL || undefined,
    });

    return user;
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    throw error;
  }
}

/**
 * Connexion avec Google
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Récupérer les infos supplémentaires (prénom, nom) depuis le profil Google
    const additionalInfo = getAdditionalUserInfo(result);
    const profile = additionalInfo?.profile as any;

    let firstName = '';
    let lastName = '';

    if (profile) {
      firstName = profile.given_name || '';
      lastName = profile.family_name || '';
    }

    // Fallback si pas trouvé dans le profil (ex: ancien compte ou scope limité)
    if (!firstName && user.displayName) {
      const parts = user.displayName.split(' ');
      if (parts.length > 0) {
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ');
      }
    }

    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userDoc = await getUserDocument(user.uid);
    if (!userDoc) {
      // Créer le document utilisateur s'il n'existe pas
      await createUserDocument(user.uid, {
        displayName: user.displayName || 'Utilisateur',
        firstName,
        lastName,
        email: user.email || '',
        photoURL: user.photoURL || undefined,
      });
    }

    return user;
  } catch (error) {
    console.error('Erreur lors de la connexion Google:', error);
    throw error;
  }
}

/**
 * Connexion avec Apple
 */
export async function signInWithApple(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const user = result.user;

    // Vérifier si l'utilisateur existe déjà dans Firestore
    const userDoc = await getUserDocument(user.uid);
    if (!userDoc) {
      // Créer le document utilisateur s'il n'existe pas
      await createUserDocument(user.uid, {
        displayName: user.displayName || 'Utilisateur',
        email: user.email || '',
        photoURL: user.photoURL || undefined,
      });
    }

    return user;
  } catch (error) {
    console.error('Erreur lors de la connexion Apple:', error);
    throw error;
  }
}

/**
 * Déconnexion
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    throw error;
  }
}

/**
 * Obtenir l'utilisateur actuel
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * Observer les changements d'état d'authentification
 * @param callback Fonction appelée à chaque changement d'état
 * @returns Fonction de désabonnement
 */
export function onAuthChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Obtenir le profil utilisateur complet depuis Firestore
 */
export async function getCurrentUserProfile(): Promise<User | null> {
  const user = getCurrentUser();
  if (!user) {
    return null;
  }

  return await getUserDocument(user.uid);
}

