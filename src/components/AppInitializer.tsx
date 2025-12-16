import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { subscribeToFriendRequests } from '@/firebase/firestore';

/**
 * Composant d'initialisation de l'application
 * Initialise l'authentification, le thème et les paramètres au démarrage
 */
export function AppInitializer() {
  const { initializeAuth, user, setFriendRequests } = useUserStore();
  const { loadSettings, applyTheme } = useSettingsStore();

  useEffect(() => {
    // Initialiser l'authentification
    initializeAuth();

    // Charger les paramètres depuis localStorage
    loadSettings();

    // Appliquer le thème
    applyTheme();
  }, [initializeAuth, loadSettings, applyTheme]);

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

