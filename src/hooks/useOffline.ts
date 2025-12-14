import { useEffect, useState } from 'react';
import { isOffline, onNetworkChange, syncLocalDataWithFirestore } from '@/firebase';
import { useUserStore } from '@/store/userStore';

/**
 * Hook personnalisé pour gérer le mode offline
 * Détecte les changements de connexion et synchronise les données
 */
export function useOffline() {
  const [online, setOnline] = useState(!isOffline());
  const { currentUser } = useUserStore();

  // Observer les changements de connexion réseau
  useEffect(() => {
    const unsubscribe = onNetworkChange((isOnline) => {
      setOnline(isOnline);

      // Si on revient en ligne et qu'un utilisateur est connecté, synchroniser
      if (isOnline && currentUser) {
        syncLocalDataWithFirestore(currentUser.uid).catch(console.error);
      }
    });

    return unsubscribe;
  }, [currentUser]);

  return {
    isOnline: online,
    isOffline: !online,
  };
}

