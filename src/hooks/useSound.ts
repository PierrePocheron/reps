import { useCallback } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

type SoundType = 'tap' | 'success' | 'complete' | 'delete';

/**
 * Hook pour gérer les effets sonores de l'application
 * Utilise l'API Audio standard du navigateur
 * Les fichiers doivent être placés dans public/sounds/
 */
export function useSound() {
  const { soundEnabled } = useSettingsStore();

  const play = useCallback((type: SoundType) => {
    if (!soundEnabled) return;

    try {
      const audio = new Audio(`/sounds/${type}.mp3`);

      // Volume ajusté selon le type
      switch (type) {
        case 'tap':
          audio.volume = 0.3; // Très subtil
          break;
        case 'success':
        case 'delete':
          audio.volume = 0.5;
          break;
        case 'complete':
          audio.volume = 0.7; // Un peu plus fort pour la célébration
          break;
      }

      audio.play().catch(e => {
        // En développement, il est normal d'avoir des erreurs si les fichiers n'existent pas encore
        console.debug(`Sound file for ${type} not found or blocked`, e);
      });
    } catch (error) {
      console.error('Error playing sound', error);
    }
  }, [soundEnabled]);

  return { play };
}
