import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { ThemeColor } from '@/utils/theme-colors';
import type { User } from '@/firebase/types';
import { logger } from '@/utils/logger';

/** Langue des contenus d'exercices : auto = langue de l'appareil */
export type LanguageSetting = 'auto' | 'fr' | 'en';

interface SettingsState {
  // État
  theme: 'light' | 'dark' | 'system';
  colorTheme: ThemeColor;
  notificationsEnabled: boolean;
  notificationTime: string; // Format HH:MM
  hapticFeedback: boolean;
  soundEnabled: boolean;
  weeklyGoal: number; // nombre de séances visées par semaine (0 = désactivé)
  streakMode: 'daily' | 'weekly'; // série en jours d'affilée (avec joker) ou en semaines à l'objectif atteint
  language: LanguageSetting;
  keepAwake: boolean; // écran allumé pendant une séance (Strong)

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorTheme: (color: ThemeColor) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationTime: (time: string) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setWeeklyGoal: (goal: number) => void;
  setStreakMode: (mode: 'daily' | 'weekly') => void;
  setLanguage: (language: LanguageSetting) => void;
  setKeepAwake: (on: boolean) => void;
  loadSettings: () => void;
  applyAccountSettings: (account: Pick<User, 'weeklyGoal' | 'streakMode'>, signedIn: boolean) => void;
  resetAccountSettings: () => void;
  saveSettings: () => void;
  applyTheme: () => void;
}

const STORAGE_KEY = 'reps_settings';

// Before any choice, and again on sign-out: the next account on the device must not take (nor upload) the previous one's
const ACCOUNT_DEFAULTS = { weeklyGoal: 3, streakMode: 'daily' } as const;

// OS dark-mode listener for the « Système » theme (one at a time)
let systemQuery: MediaQueryList | null = null;
let systemListener: ((e: MediaQueryListEvent) => void) | null = null;

// The weekly goal and the streak mode follow the account (users/{uid}/private/profile): a new device came back to
// 3× and « Jours », and recomputed the weekly streak saved on the profile with its own goal
function saveToAccount(change: Pick<User, 'weeklyGoal' | 'streakMode'>) {
  void Promise.all([import('./userStore'), import('@/firebase')])
    .then(([{ useUserStore }, { updateUserDocument }]) => {
      const uid = useUserStore.getState().currentUser?.uid;
      return uid ? updateUserDocument(uid, change) : undefined;
    })
    .catch((error) => logger.error('Réglage non enregistré sur le compte', error));
}

function setDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
  // Android draws the status bar icons for the phone's theme, not the app's: unreadable when the two differ
  if (Capacitor.isNativePlatform()) {
    StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch((error) => logger.warn('Barre d\'état non mise à jour', { error }));
  }
}

/**
 * Store Zustand pour la gestion des paramètres de l'application
 */
export const useSettingsStore = create<SettingsState>((set, get) => {
  // Charger les paramètres depuis localStorage au démarrage
  const loadFromStorage = (): Partial<SettingsState> => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des paramètres:', error);
    }
    return {};
  };

  const storedSettings = loadFromStorage();

  return {
    // État initial (depuis localStorage ou valeurs par défaut)
    theme: (storedSettings.theme as 'light' | 'dark' | 'system') || 'system',
    colorTheme: (storedSettings.colorTheme as ThemeColor) || 'violet',
    notificationsEnabled: storedSettings.notificationsEnabled ?? false,
    notificationTime: storedSettings.notificationTime || '18:00',
    hapticFeedback: storedSettings.hapticFeedback ?? true,
    soundEnabled: storedSettings.soundEnabled ?? true,
    weeklyGoal: storedSettings.weeklyGoal ?? ACCOUNT_DEFAULTS.weeklyGoal,
    streakMode: storedSettings.streakMode ?? ACCOUNT_DEFAULTS.streakMode,
    language: storedSettings.language ?? 'auto',
    keepAwake: storedSettings.keepAwake ?? true,

    // Actions
    setTheme: (theme) => {
      set({ theme });
      get().saveSettings();
      get().applyTheme();
    },

    setColorTheme: (color) => {
      set({ colorTheme: color });
      get().saveSettings();
      // Appliquer la couleur via le userStore si l'utilisateur est connecté
      import('./userStore').then(({ useUserStore }) => {
        const { user, updateThemeColor } = useUserStore.getState();
        if (user && updateThemeColor) {
          updateThemeColor(color).catch((e) => logger.error('Theme color update error', e));
        }
      });
    },

    setNotificationsEnabled: (enabled) => {
      set({ notificationsEnabled: enabled });
      get().saveSettings();
    },

    setNotificationTime: (time) => {
      if (!time) return; // cleared time field: '' was scheduled at midnight
      set({ notificationTime: time });
      get().saveSettings();
    },

    setHapticFeedback: (enabled) => {
      set({ hapticFeedback: enabled });
      get().saveSettings();
    },

    setSoundEnabled: (enabled) => {
      set({ soundEnabled: enabled });
      get().saveSettings();
    },

    setStreakMode: (mode) => {
      set({ streakMode: mode });
      get().saveSettings();
      saveToAccount({ streakMode: mode });
    },

    setWeeklyGoal: (goal) => {
      set({ weeklyGoal: goal });
      get().saveSettings();
      saveToAccount({ weeklyGoal: goal });
    },

    setLanguage: (language) => {
      set({ language });
      get().saveSettings();
    },

    setKeepAwake: (on) => {
      set({ keepAwake: on });
      get().saveSettings();
    },

    /**
     * Charge les paramètres depuis localStorage
     */
    loadSettings: () => {
      const stored = loadFromStorage();
      if (Object.keys(stored).length > 0) {
        set({ ...stored, notificationTime: stored.notificationTime || '18:00' }); // '' saved by older versions
        get().applyTheme();
      }
    },

    /**
     * The account values win; localStorage keeps them as a cache. One the account does not hold yet (older versions, new
     * account) is uploaded from the device at sign-in: the device's own value, or the default since sign-out resets them
     */
    applyAccountSettings: ({ weeklyGoal, streakMode }, signedIn) => {
      const account: Partial<SettingsState> = {};
      const missing: Pick<User, 'weeklyGoal' | 'streakMode'> = {};
      if (typeof weeklyGoal === 'number') account.weeklyGoal = weeklyGoal;
      else missing.weeklyGoal = get().weeklyGoal;
      if (streakMode === 'daily' || streakMode === 'weekly') account.streakMode = streakMode;
      else missing.streakMode = get().streakMode;
      if (signedIn && Object.keys(missing).length > 0) saveToAccount(missing);
      if (Object.keys(account).length === 0) return;
      set(account);
      get().saveSettings();
    },

    resetAccountSettings: () => {
      set(ACCOUNT_DEFAULTS);
      get().saveSettings();
    },

    /**
     * Sauvegarde les paramètres dans localStorage
     */
    saveSettings: () => {
      try {
        const { theme, colorTheme, notificationsEnabled, notificationTime, hapticFeedback, weeklyGoal, language } =
          get();
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            theme,
            colorTheme,
            notificationsEnabled,
            notificationTime,
            hapticFeedback,
            soundEnabled: get().soundEnabled,
            weeklyGoal,
            streakMode: get().streakMode,
            language,
            keepAwake: get().keepAwake,
          })
        );
      } catch (error) {
        logger.error('Erreur lors de la sauvegarde des paramètres:', error);
      }
    },

    /**
     * Applique le thème (clair/sombre) selon les préférences
     */
    applyTheme: () => {
      const { theme } = get();
      // matchMedia() returns a new object on each call: the listener must be kept, and removed, on one object.
      // The old code never found it again — listeners piled up and « Clair » still followed the OS at sunset.
      if (systemListener) systemQuery?.removeEventListener('change', systemListener);
      systemListener = null;

      if (theme === 'system') {
        systemQuery ??= window.matchMedia('(prefers-color-scheme: dark)');
        setDark(systemQuery.matches);
        systemListener = (e: MediaQueryListEvent) => setDark(e.matches);
        systemQuery.addEventListener('change', systemListener);
      } else {
        setDark(theme === 'dark');
      }
    },
  };
});

// Appliquer le thème au démarrage
if (typeof window !== 'undefined') {
  useSettingsStore.getState().applyTheme();
}

