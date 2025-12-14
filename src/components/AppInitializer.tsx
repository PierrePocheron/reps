import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Composant d'initialisation de l'application
 * Initialise l'authentification, le thème et les paramètres au démarrage
 */
export function AppInitializer() {
  const { initializeAuth } = useUserStore();
  const { loadSettings, applyTheme } = useSettingsStore();

  useEffect(() => {
    // Initialiser l'authentification
    initializeAuth();

    // Charger les paramètres depuis localStorage
    loadSettings();

    // Appliquer le thème
    applyTheme();
  }, [initializeAuth, loadSettings, applyTheme]);

  // Ce composant ne rend rien
  return null;
}

