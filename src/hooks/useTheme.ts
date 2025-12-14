import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { applyThemeColor, type ThemeColor } from '@/utils/theme-colors';
import { useUserStore } from '@/store/userStore';

/**
 * Hook personnalisé pour gérer le thème (clair/sombre) et la couleur
 * Encapsule la logique de thème et applique les changements au DOM
 */
export function useTheme() {
  const {
    theme,
    colorTheme,
    setTheme,
    setColorTheme,
    applyTheme,
  } = useSettingsStore();

  const { user } = useUserStore();

  // Appliquer le thème au montage et quand il change
  useEffect(() => {
    applyTheme();
  }, [theme, applyTheme]);

  // Appliquer la couleur de thème depuis le profil utilisateur si disponible
  useEffect(() => {
    if (user?.colorTheme) {
      applyThemeColor(user.colorTheme);
      // Synchroniser avec le store settings
      if (user.colorTheme !== colorTheme) {
        setColorTheme(user.colorTheme);
      }
    } else if (colorTheme) {
      // Appliquer la couleur depuis les settings si pas de couleur utilisateur
      applyThemeColor(colorTheme);
    }
  }, [user?.colorTheme, colorTheme, setColorTheme]);

  // Écouter les changements de préférences système si le thème est "system"
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return {
    // État
    theme,
    colorTheme,
    isDark: document.documentElement.classList.contains('dark'),

    // Actions
    setTheme,
    setColorTheme: async (color: ThemeColor) => {
      setColorTheme(color);
      applyThemeColor(color);
    },

    // Utilitaires
    toggleTheme: () => {
      const newTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
      setTheme(newTheme);
    },
  };
}

