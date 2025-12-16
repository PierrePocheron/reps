import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User, UserStats, FriendRequest } from '@/firebase/types';
import {
  onAuthChange,
  getCurrentUserProfile,
  updateUserDocument,
  calculateUserStats,
  subscribeToUser,
} from '@/firebase';
import { applyThemeColor, type ThemeColor } from '@/utils/theme-colors';

interface UserState {
  // État
  user: User | null;
  currentUser: FirebaseUser | null;
  stats: UserStats | null;
  friendRequests: FriendRequest[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setCurrentUser: (user: FirebaseUser | null) => void;
  setStats: (stats: UserStats | null) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  setLoading: (loading: boolean) => void;
  initializeAuth: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  updateThemeColor: (color: ThemeColor) => Promise<void>;
  refreshStats: () => Promise<void>;
  reset: () => void;
}

/**
 * Store Zustand pour la gestion de l'utilisateur et de l'authentification
 */
export const useUserStore = create<UserState>((set, get) => ({
  // État initial
  user: null,
  currentUser: null,
  stats: null,
  friendRequests: [],
  isLoading: true,
  isAuthenticated: false,

  // Actions
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user?.colorTheme) {
      applyThemeColor(user.colorTheme);
    }
  },

  setCurrentUser: (currentUser) => {
    set({ currentUser, isAuthenticated: !!currentUser });
  },

  setStats: (stats) => set({ stats }),
  setFriendRequests: (requests) => set({ friendRequests: requests }),
  setLoading: (isLoading) => set({ isLoading }),

  /**
   * Initialise l'authentification et écoute les changements
   */
  initializeAuth: async () => {
    set({ isLoading: true });

    // Observer les changements d'authentification
    onAuthChange(async (firebaseUser: FirebaseUser | null) => {
      const { setCurrentUser, loadUserProfile } = get();

      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        // Charger le profil utilisateur
        try {
          await loadUserProfile();
        } catch (error) {
          console.error('Erreur lors du chargement du profil:', error);
          set({ isLoading: false });
        }
      } else {
        // Réinitialiser l'état si déconnecté
        get().reset();
      }

      set({ isLoading: false });
    });
  },

  /**
   * Charge le profil utilisateur depuis Firestore
   */
  loadUserProfile: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser) {
        set({ user: null, stats: null, isLoading: false });
        return;
      }

      // Récupérer le profil
      const userProfile = await getCurrentUserProfile();
      if (userProfile) {
        get().setUser(userProfile);

        // Calculer les stats
        await get().refreshStats();

        // S'abonner aux mises à jour en temps réel
        subscribeToUser(currentUser.uid, (updatedUser) => {
          if (updatedUser) {
            get().setUser(updatedUser);
          }
        });
      } else {
        // Si le profil n'existe pas, créer un document par défaut
        console.warn('Document utilisateur non trouvé, création en cours...');
        const { createUserDocument } = await import('@/firebase');
        await createUserDocument(currentUser.uid, {
          displayName: currentUser.displayName || 'Utilisateur',
          email: currentUser.email || '',
          photoURL: currentUser.photoURL || undefined,
        });

        // Recharger le profil
        const newProfile = await getCurrentUserProfile();
        if (newProfile) {
          get().setUser(newProfile);
          await get().refreshStats();
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
      set({ user: null, stats: null, isLoading: false });
    }
  },

  /**
   * Met à jour le profil utilisateur
   */
  updateProfile: async (updates) => {
    try {
      const { user } = get();
      if (!user) {
        throw new Error('Aucun utilisateur connecté');
      }

      await updateUserDocument(user.uid, updates);

      // Recharger le profil pour avoir les données à jour
      await get().loadUserProfile();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      throw error;
    }
  },

  /**
   * Met à jour la couleur de thème
   */
  updateThemeColor: async (color: ThemeColor) => {
    try {
      const { user, updateProfile } = get();
      if (!user) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Appliquer la couleur immédiatement
      applyThemeColor(color);

      // Sauvegarder dans Firestore
      await updateProfile({ colorTheme: color });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la couleur:', error);
      throw error;
    }
  },

  /**
   * Rafraîchit les statistiques de l'utilisateur
   */
  refreshStats: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser) {
        set({ stats: null });
        return;
      }

      const stats = await calculateUserStats(currentUser.uid);
      set({ stats });
    } catch (error) {
      console.error('Erreur lors du calcul des stats:', error);
      set({ stats: null });
    }
  },

  /**
   * Réinitialise l'état du store
   */
  reset: () => {
    set({
      user: null,
      currentUser: null,
      stats: null,
      isLoading: false,
      isAuthenticated: false,
    });
  },
}));

