import { create } from 'zustand';
import type { ThemeColor } from '@/utils/theme-colors';

interface SettingsState {
  // État
  theme: 'light' | 'dark' | 'system';
  colorTheme: ThemeColor;
  notificationsEnabled: boolean;
  notificationTime: string; // Format HH:MM
  hapticFeedback: boolean;
  soundEnabled: boolean;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setColorTheme: (color: ThemeColor) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setNotificationTime: (time: string) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  loadSettings: () => void;
  saveSettings: () => void;
  applyTheme: () => void;
}

const STORAGE_KEY = 'reps_settings';

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
      console.error('Erreur lors du chargement des paramètres:', error);
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
          updateThemeColor(color).catch(console.error);
        }
      });
    },

    setNotificationsEnabled: (enabled) => {
      set({ notificationsEnabled: enabled });
      get().saveSettings();
    },

    setNotificationTime: (time) => {
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

    /**
     * Charge les paramètres depuis localStorage
     */
    loadSettings: () => {
      const stored = loadFromStorage();
      if (Object.keys(stored).length > 0) {
        set(stored);
        get().applyTheme();
      }
    },

    /**
     * Sauvegarde les paramètres dans localStorage
     */
    saveSettings: () => {
      try {
        const { theme, colorTheme, notificationsEnabled, notificationTime, hapticFeedback } =
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
          })
        );
      } catch (error) {
        console.error('Erreur lors de la sauvegarde des paramètres:', error);
      }
    },

    /**
     * Applique le thème (clair/sombre) selon les préférences
     */
    applyTheme: () => {
      const { theme } = get();
      const root = document.documentElement;

      if (theme === 'system') {
        // Utiliser les préférences système
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }

        // Écouter les changements de préférences système
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
          if (e.matches) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        };

        // Supprimer l'ancien listener s'il existe
        interface MediaQueryWithListener extends MediaQueryList {
          __listener?: (e: MediaQueryListEvent) => void;
        }
        const mediaQueryWithListener = mediaQuery as MediaQueryWithListener;
        if (mediaQueryWithListener.__listener) {
          mediaQuery.removeEventListener('change', mediaQueryWithListener.__listener);
        }

        // Ajouter le nouveau listener
        mediaQuery.addEventListener('change', handleChange);
        mediaQueryWithListener.__listener = handleChange;
      } else if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    },
  };
});

// Appliquer le thème au démarrage
if (typeof window !== 'undefined') {
  useSettingsStore.getState().applyTheme();
}

