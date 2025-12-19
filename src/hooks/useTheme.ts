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
  // 1. Synchroniser le store settings quand le profil utilisateur change
  // (chargement initial ou mise à jour distante)
  useEffect(() => {
    if (user?.colorTheme) {
      // On ne met à jour que si la couleur est différente pour éviter les boucles
      if (user.colorTheme !== colorTheme) {
        setColorTheme(user.colorTheme);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.colorTheme, setColorTheme]); // Retiré colorTheme des dépendances pour éviter le conflit

  // 2. Appliquer la couleur visuellement quand le store settings change
  // C'est la source de vérité pour l'affichage immédiat
  useEffect(() => {
    if (colorTheme) {
      applyThemeColor(colorTheme);
    }
  }, [colorTheme]);

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

