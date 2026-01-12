import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { subscribeToFriendRequests } from '@/firebase/firestore';
import { applyThemeColor } from '@/utils/theme-colors';
import { initializeAdMob } from '@/utils/admob';
import { useBadgeEvents } from '@/hooks/useBadgeEvents';

/**
 * Composant d'initialisation de l'application
 * Initialise l'authentification, le thème et les paramètres au démarrage
 */
export function AppInitializer() {
  const { initializeAuth, user, setFriendRequests } = useUserStore();
  const { loadSettings, applyTheme } = useSettingsStore();

  // Souscrire aux événements de badges (Gamification)
  useBadgeEvents();

  useEffect(() => {
    // Initialiser l'authentification
    initializeAuth();

    // Initialiser AdMob (Mobile)
    initializeAdMob();



    // Charger les paramètres depuis localStorage
    loadSettings();

    // Appliquer le thème (priorité au profil utilisateur si connecté, sinon localStorage)
    if (user?.colorTheme) {
      applyThemeColor(user.colorTheme);
    } else {
      applyTheme();
    }
  }, [initializeAuth, loadSettings, applyTheme, user?.colorTheme]);

  // Souscription aux demandes d'amis
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToFriendRequests(user.uid, (requests) => {
      // Filtrer les demandes provenant de personnes déjà amies
      const filteredRequests = requests.filter(req => !user.friends?.includes(req.fromUserId));
      setFriendRequests(filteredRequests);
    });

    return () => unsubscribe();
  }, [user, setFriendRequests]);

  // Ce composant ne rend rien
  return null;
}

