import { create } from 'zustand';
import type { SessionExercise, Exercise } from '@/firebase/types';
import { DEFAULT_EXERCISES } from '@/utils/constants';
import { calculateDynamicCalories } from '@/utils/calories';
import {
  createSession,
  updateUserStatsAfterSession,
  saveCurrentSessionToLocal,
  getCurrentSessionFromLocal,
  clearCurrentSessionFromLocal,
  type LocalSession,
} from '@/firebase';
import { Timestamp } from 'firebase/firestore';
import { logger } from '@/utils/logger';
import { useUserStore } from './userStore';

interface SessionState {
  // État
  isActive: boolean;
  startTime: number | null;
  exercises: SessionExercise[];
  duration: number; // en secondes
  totalReps: number;

  // Actions
  startSession: () => void;
  endSession: () => Promise<void>;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseName: string) => void;
  addReps: (exerciseName: string, reps: number) => void;
  resetSession: () => void;
  loadSessionFromLocal: () => void;
  saveSessionToLocal: () => void;
  getExerciseReps: (exerciseName: string) => number;
  getFormattedDuration: () => string;
}

/**
 * Store Zustand pour la gestion de la session d'entraînement
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  // État initial
  isActive: false,
  startTime: null,
  exercises: [],
  duration: 0,
  totalReps: 0,

  /**
   * Démarre une nouvelle session
   */
  startSession: () => {
    const startTime = Date.now();
    set({
      isActive: true,
      startTime,
      exercises: [],
      duration: 0,
      totalReps: 0,
    });

    // Sauvegarder dans localStorage
    get().saveSessionToLocal();
  },

  /**
   * Termine la session et sauvegarde dans Firestore
   */
  endSession: async (): Promise<void> => {
    try {
      const { startTime, exercises, totalReps, isActive } = get();
      if (!isActive || !startTime) {
        return;
      }

      const { currentUser, user } = useUserStore.getState();
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Calculer la durée
      const duration = Math.floor((Date.now() - startTime) / 1000);

      // Calculer les calories
      const totalCalories = exercises.reduce((sum, sessionEx) => {
        // Chercher l'exercice dans les défauts pour avoir les données MET/Time
        // Pour les exercices custom (pas trouvés), on passera un objet vide qui déclenchera les fallbacks du calculateur
        const defaultEx = DEFAULT_EXERCISES.find(e => e.name === sessionEx.name) || {} as Exercise;

        return sum + calculateDynamicCalories(user, defaultEx, sessionEx.reps);
      }, 0);

      // Créer la session dans Firestore
      await createSession(currentUser.uid, {
        date: Timestamp.now(),
        duration,
        exercises,
        totalReps,
        totalCalories: Math.round(totalCalories),
      });

      // Si la création réussit, on considère la session comme terminée localement
      // même si les mises à jour de stats échouent
      try {
        // Mettre à jour les stats de l'utilisateur
        await updateUserStatsAfterSession(currentUser.uid, totalReps);

        // Rafraîchir les stats dans le store utilisateur
        await useUserStore.getState().refreshStats();
      } catch (statsError) {
        logger.error('Erreur lors de la mise à jour des stats:', statsError);
        // On continue pour nettoyer la session locale
      }

      // Réinitialiser la session
      get().resetSession();

      // Supprimer la session locale
      clearCurrentSessionFromLocal();
    } catch (error) {
      logger.error('Erreur lors de la fin de la session:', error);
      throw error;
    }
  },

  /**
   * Ajoute un exercice à la session
   */
  addExercise: (exercise: Exercise) => {
    const { exercises } = get();

    // Vérifier si l'exercice n'existe pas déjà
    if (exercises.some((ex) => ex.name === exercise.name)) {
      return;
    }

    const newExercise: SessionExercise = {
      name: exercise.name,
      emoji: exercise.emoji,
      reps: 0,
    };

    set({
      exercises: [...exercises, newExercise],
    });

    get().saveSessionToLocal();
  },

  /**
   * Supprime un exercice de la session
   */
  removeExercise: (exerciseName: string) => {
    const { exercises } = get();

    // Recalculer le total après suppression
    const updatedExercises = exercises.filter((ex) => ex.name !== exerciseName);
    const newTotalReps = updatedExercises.reduce((sum, ex) => sum + ex.reps, 0);

    set({
      exercises: updatedExercises,
      totalReps: Math.max(0, newTotalReps),
    });

    get().saveSessionToLocal();
  },

  /**
   * Ajoute des reps à un exercice
   */
  addReps: (exerciseName: string, reps: number) => {
    const { exercises } = get();
    const updatedExercises = exercises.map((ex) => {
      if (ex.name === exerciseName) {
        return { ...ex, reps: ex.reps + reps };
      }
      return ex;
    });

    // Recalculer le total
    const newTotalReps = updatedExercises.reduce((sum, ex) => sum + ex.reps, 0);

    set({
      exercises: updatedExercises,
      totalReps: newTotalReps,
    });

    // Mettre à jour la durée
    if (get().startTime) {
      const duration = Math.floor((Date.now() - get().startTime!) / 1000);
      set({ duration });
    }

    get().saveSessionToLocal();
  },

  /**
   * Réinitialise la session
   */
  resetSession: () => {
    set({
      isActive: false,
      startTime: null,
      exercises: [],
      duration: 0,
      totalReps: 0,
    });
  },

  /**
   * Charge la session depuis localStorage (pour mode offline)
   */
  loadSessionFromLocal: () => {
    const localSession = getCurrentSessionFromLocal();
    if (localSession && localSession.startTime !== undefined) {
      // Vérifier si la session n'est pas trop ancienne (max 24h)
      const sessionAge = Date.now() - localSession.startTime;
      const maxAge = 24 * 60 * 60 * 1000; // 24 heures

      if (sessionAge < maxAge) {
        set({
          isActive: true,
          startTime: localSession.startTime,
          exercises: localSession.exercises || [],
          duration: localSession.duration || 0,
          totalReps: localSession.totalReps || 0,
        });
      } else {
        // Session trop ancienne, la supprimer
        clearCurrentSessionFromLocal();
      }
    }
  },

  /**
   * Sauvegarde la session dans localStorage
   */
  saveSessionToLocal: () => {
    const { isActive, startTime, exercises, duration, totalReps } = get();
    if (isActive && startTime !== null) {
      const localSession: Partial<LocalSession> = {
        startTime,
        exercises,
        duration,
        totalReps,
      };
      saveCurrentSessionToLocal(localSession);
    }
  },

  /**
   * Obtient le nombre de reps pour un exercice
   */
  getExerciseReps: (exerciseName: string) => {
    const { exercises } = get();
    const exercise = exercises.find((ex) => ex.name === exerciseName);
    return exercise?.reps || 0;
  },

  /**
   * Formate la durée en MM:SS
   */
  getFormattedDuration: () => {
    const { duration, startTime } = get();
    let seconds = duration;

    // Si la session est active, calculer la durée actuelle
    if (startTime && get().isActive) {
      seconds = Math.floor((Date.now() - startTime) / 1000);
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  },
}));

