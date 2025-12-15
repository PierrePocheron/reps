import { useUserStore } from '@/store/userStore';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithApple,
  signOut,
} from '@/firebase';

/**
 * Hook personnalisé pour gérer l'authentification
 * Encapsule la logique d'authentification et l'état utilisateur
 */
export function useAuth() {
  const {
    user,
    currentUser,
    stats,
    isLoading,
    isAuthenticated,
    loadUserProfile,
    refreshStats,
  } = useUserStore();

  // L'initialisation est gérée par AppInitializer
  // Pas besoin de useEffect ici pour éviter les boucles infinies

  return {
    // État
    user,
    currentUser,
    stats,
    isLoading,
    isAuthenticated,

    // Actions d'authentification
    signInWithEmail: async (email: string, password: string) => {
      await signInWithEmail(email, password);
      await loadUserProfile();
    },

    signUpWithEmail: async (email: string, password: string, displayName: string) => {
      await signUpWithEmail(email, password, displayName);
      await loadUserProfile();
    },

    signInWithGoogle: async () => {
      await signInWithGoogle();
      await loadUserProfile();
    },

    signInWithApple: async () => {
      await signInWithApple();
      await loadUserProfile();
    },

    signOut: async () => {
      await signOut();
    },

    // Utilitaires
    refreshStats,
  };
}

