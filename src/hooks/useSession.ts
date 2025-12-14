import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { DEFAULT_EXERCISES } from '@/utils/constants';
import type { Exercise } from '@/firebase/types';

/**
 * Hook personnalisé pour gérer la session d'entraînement
 * Encapsule la logique de session et les interactions avec les exercices
 */
export function useSession() {
  const {
    isActive,
    startTime,
    exercises,
    duration,
    totalReps,
    startSession,
    endSession,
    addExercise,
    removeExercise,
    addReps,
    resetSession,
    loadSessionFromLocal,
    getExerciseReps,
    getFormattedDuration,
  } = useSessionStore();

  // Charger la session depuis localStorage au montage si elle existe
  useEffect(() => {
    loadSessionFromLocal();
  }, [loadSessionFromLocal]);

  // Mettre à jour la durée toutes les secondes si la session est active
  useEffect(() => {
    if (!isActive || !startTime) return;

    const interval = setInterval(() => {
      const newDuration = Math.floor((Date.now() - startTime) / 1000);
      useSessionStore.setState({ duration: newDuration });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  return {
    // État
    isActive,
    startTime,
    exercises,
    duration,
    totalReps,

    // Actions
    startSession,
    endSession,
    addExercise,
    removeExercise,
    addReps,
    resetSession,

    // Utilitaires
    getExerciseReps,
    getFormattedDuration,

    // Helpers
    /**
     * Ajoute un exercice par défaut à la session
     */
    addDefaultExercise: (exerciseId: string) => {
      const exercise = DEFAULT_EXERCISES.find((ex) => ex.id === exerciseId);
      if (exercise) {
        addExercise(exercise);
      }
    },

    /**
     * Ajoute un exercice personnalisé à la session
     */
    addCustomExercise: (name: string, emoji: string) => {
      const customExercise: Exercise = {
        id: `custom-${Date.now()}`,
        name,
        emoji,
      };
      addExercise(customExercise);
    },

    /**
     * Vérifie si un exercice est déjà dans la session
     */
    hasExercise: (exerciseName: string) => {
      return exercises.some((ex) => ex.name === exerciseName);
    },

    /**
     * Obtient tous les exercices disponibles (défaut + personnalisés)
     */
    getAvailableExercises: () => {
      // Pour l'instant, retourner seulement les exercices par défaut
      // Plus tard, on pourra ajouter les exercices personnalisés de l'utilisateur
      return DEFAULT_EXERCISES;
    },
  };
}

