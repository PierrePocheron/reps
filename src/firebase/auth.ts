import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth } from './config';
import { createUserDocument, getUserDocument } from './firestore';
import type { User } from './types';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

/**
 * Helpers pour l'authentification Firebase
 */

// Provider Google
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});



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
export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<FirebaseUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const normalizedFirstName = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedLastName = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    let displayName = `${normalizedFirstName}${normalizedLastName}`;

    // Fallback si vide ou trop court
    if (displayName.length < 3) {
      displayName = `user${Math.floor(Math.random() * 10000)}`;
    }

    // Mise à jour du profil avec le nom d'affichage
    await updateProfile(user, { displayName });

    // Création du document utilisateur dans Firestore
    await createUserDocument(user.uid, {
      displayName,
      firstName,
      lastName,
      email: user.email || email,
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
export async function signInWithGoogle(): Promise<FirebaseUser | undefined> {
  try {
    if (Capacitor.isNativePlatform()) {
      // Sur mobile, on utilise le plugin natif qui gère le flux Google Sign-In correctement
      const res = await SocialLogin.login({
        provider: 'google',
        options: {
          scopes: ['email', 'profile'],
        },
      });

      // Vérifier qu'on a une réponse en mode "online" avec idToken
      if (res.result.responseType === 'offline') {
        throw new Error('Google login configured in offline mode, but idToken is required');
      }

      const idToken = res.result.idToken;
      if (!idToken) {
        throw new Error('No idToken received from Google login');
      }

      const credential = GoogleAuthProvider.credential(idToken);

      const result = await signInWithCredential(auth, credential);
      return handleGoogleSignInResult(result.user, result);
    } else {
      // Sur web, popup classique
      const result = await signInWithPopup(auth, googleProvider);
      return handleGoogleSignInResult(result.user, result);
    }
  } catch (error) {
    console.error('Erreur lors de la connexion Google:', error);
    throw error;
  }
}

/**
 * Traite le résultat d'une connexion Google (création profil, etc.)
 * Utilisé par signInWithPopup et par getRedirectResult
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleGoogleSignInResult(user: FirebaseUser, result?: any): Promise<FirebaseUser> {
    try {
        let firstName = '';
        let lastName = '';

        // Si on a le résultat complet (Popup ou Redirect), on essaie d'extraire les infos
        if (result) {
            const additionalInfo = getAdditionalUserInfo(result);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profile = additionalInfo?.profile as any;

            if (profile) {
              firstName = profile.given_name || '';
              lastName = profile.family_name || '';
            }
        }

        // Fallback si pas trouvé dans le profil
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
          // Générer un pseudo valide (lowercase, sans espace)
          let displayName = user.displayName || 'Utilisateur';
          displayName = displayName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
          if (displayName.length < 3) displayName = `user${Math.floor(Math.random() * 10000)}`;

          // Créer le document utilisateur s'il n'existe pas
          await createUserDocument(user.uid, {
            displayName,
            firstName,
            lastName,
            email: user.email || '',
          });
        }

        return user;
    } catch (error) {
        console.error("Erreur lors du traitement du résultat Google:", error);
        throw error;
    }
}

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de réinitialisation:', error);
    throw error;
  }
}

/**
 * Déconnexion
 */
export async function signOut(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      try {
        await SocialLogin.logout({ provider: 'google' });
      } catch (e) {
        // Ignorer si pas connecté ou erreur plugin
        console.warn('SocialLogin signOut error', e);
      }
    }
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
