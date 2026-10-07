import { create } from 'zustand';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User, UserStats, FriendRequest } from '@/firebase/types';
import {
  onAuthChange,
  getCurrentUserProfile,
  updateUserDocument,
  calculateUserStats,
  subscribeToUser,
  markBadgesAsSeen,
  onUserStatsComputed,
  updateUserStatsAfterSession,
} from '@/firebase';
import { deleteUserAccount } from '@/firebase/deleteAccount';
import { applyThemeColor, type ThemeColor } from '@/utils/theme-colors';
import { logger } from '@/utils/logger';
import { updateWidget } from '@/utils/widget';
import { useSettingsStore } from './settingsStore';

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
  markBadgesAsSeen: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  reset: () => void;
}

// Auth state listener: replaced, never stacked, if initializeAuth runs again
let stopAuthListener: (() => void) | null = null;

// Live user document listener: one at a time, stopped on reset (sign-out / deletion), or it hit permission-denied
let stopUserListener: (() => void) | null = null;
function listenToUser(uid: string, setUser: (user: User) => void) {
  stopUserListener?.();
  const stopDoc = subscribeToUser(uid, (updatedUser) => {
    if (updatedUser) setUser(updatedUser);
  });
  // Resident app (Android back only minimises it, PWA tab) shown again on a later day: Statistics, Profil and Badges
  // kept the streak of the last calculation while the header and the widget had moved on. Once per new day
  let day = new Date().toDateString();
  const onShown = () => {
    if (document.visibilityState !== 'visible' || day === new Date().toDateString()) return;
    day = new Date().toDateString();
    void useUserStore.getState().refreshStats();
  };
  document.addEventListener('visibilitychange', onShown);
  stopUserListener = () => {
    stopDoc();
    document.removeEventListener('visibilitychange', onShown);
  };
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
    const signedIn = !!user && user.uid !== get().user?.uid; // not on every live update: a fresh local change would be undone
    set({ user, isAuthenticated: !!user });
    if (signedIn) useSettingsStore.getState().applyAccountSettings(user);
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

    // Fallback: Si onAuthChange ne répond pas après 5s, on débloque
    const timeout = setTimeout(() => {
      if (get().isLoading) {
        set({ isLoading: false });
      }
    }, 5000);

    // Observer les changements d'authentification
    stopAuthListener?.();
    stopAuthListener = onAuthChange(async (firebaseUser: FirebaseUser | null) => {
      clearTimeout(timeout);

      const { setCurrentUser, loadUserProfile } = get();

      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        // Charger le profil utilisateur
        try {
          await loadUserProfile();
        } catch (error) {
          logger.error('[DEBUG_IOS] Erreur lors du chargement du profil:', error);
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
      // Signed out (or switched account) while awaiting: never set the old profile back nor re-attach its listener
      const stale = () => get().currentUser?.uid !== currentUser.uid;

      // Récupérer le profil
      const userProfile = await getCurrentUserProfile();
      if (stale()) return;

      if (userProfile) {
        get().setUser(userProfile);

        await get().refreshStats();
        if (stale()) return;

        if (currentUser.uid === userProfile.uid) {
             listenToUser(currentUser.uid, get().setUser);
        }
      } else {
        // Retry logic...
        await new Promise(resolve => setTimeout(resolve, 1000));

        const retryProfile = await getCurrentUserProfile();
        if (stale()) return;

        if (retryProfile) {
           get().setUser(retryProfile);
           await get().refreshStats();
           if (stale()) return;

            listenToUser(currentUser.uid, get().setUser);
           return;
        }

        logger.warn('[UserStore] Document utilisateur non trouvé après délai, création fallback...');
        const { createUserDocument } = await import('@/firebase');
        try {
          await createUserDocument(currentUser.uid, {
            displayName: currentUser.displayName || 'Utilisateur',
            email: currentUser.email || '',
          });

          logger.info('[UserStore] Fallback profile created, re-fetching...');
          const newProfile = await getCurrentUserProfile();
          if (stale()) return;
          if (newProfile) {
            get().setUser(newProfile);
            await get().refreshStats();
            if (stale()) return;
             listenToUser(currentUser.uid, get().setUser);
          }
        } catch (createError) {
           logger.error("[UserStore] Impossible de créer le profil fallback:", createError);
        }
      }
    } catch (error) {
      logger.error('[UserStore] Erreur lors du chargement du profil:', error);
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
      logger.error('Erreur lors de la mise à jour du profil:', error);
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
      logger.error('Erreur lors de la mise à jour de la couleur:', error);
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
      if (get().currentUser?.uid !== currentUser.uid) return; // signed out meanwhile
      set({ stats });
    } catch (error) {
      logger.error('Erreur lors du calcul des stats:', error);
      set({ stats: null });
    }
  },

  /**
   * Marque les badges comme vus
   */
  markBadgesAsSeen: async () => {
    try {
      const { user } = get();
      if (user) {
        await markBadgesAsSeen(user.uid);
        // Optimistic update
        set({ user: { ...user, newBadgeIds: [] } });
      }
    } catch (e) {
      logger.error('markBadgesAsSeen failed', e as Error);
    }
  },

  /**
   * Supprime définitivement le compte et toutes les données
   */
  deleteAccount: async (password?: string) => {
    const { user } = get();
    if (!user) throw new Error('Aucun utilisateur connecté');
    await deleteUserAccount(user.uid, password);
    get().reset();
  },

  /**
   * Réinitialise l'état du store
   */
  reset: () => {
    stopUserListener?.();
    stopUserListener = null;
    // Home-screen widget keeps its own copy: blank it, or it shows the signed-out / deleted account's streak
    updateWidget({ streak: 0, weekly: false, weekDone: 0, weekGoal: 0, validUntil: 0, weekStart: 0 });
    // Nettoyer la session en cours (Zustand + LocalStorage)
    try {
      // Import dynamique pour éviter les dépendances circulaires top-level à l'initialisation
      // (bien que l'import statique fonctionne souvent, restons prudents)
      import('./sessionStore').then(({ useSessionStore }) => {
        useSessionStore.getState().resetSession();
      });
      // Séance muscu aussi (persistée) : sinon le compte suivant sur l'appareil la retrouvait et l'enregistrait chez lui
      import('./gymSessionStore').then(({ useGymSessionStore }) => {
        useGymSessionStore.getState().cancelSession();
      });

      import('@/firebase').then(({ clearCurrentSessionFromLocal }) => {
        clearCurrentSessionFromLocal();
      });
    } catch (e) {
      logger.error("Erreur lors du nettoyage de la session:", e);
    }

    set({
      user: null,
      currentUser: null,
      stats: null,
      friendRequests: [],
      isLoading: false,
      isAuthenticated: false,
    });
  },
}));

// Every stats recalculation (gym session, challenge day, goal change, edits) refreshes Statistics and badges
onUserStatsComputed((stats) => useUserStore.getState().setStats(stats));

// The weekly streak and the widget follow the goal and the mode: recompute on any change, from any screen (the welcome
// questionnaire set the goal without it, so the widget kept « x/3 » while Statistics said « x/5 »)
useSettingsStore.subscribe((now, before) => {
  if (now.weeklyGoal === before.weeklyGoal && now.streakMode === before.streakMode) return;
  const uid = useUserStore.getState().currentUser?.uid;
  if (uid) updateUserStatsAfterSession(uid, 0).catch((err) => logger.error('Recalcul de la série :', err));
});
