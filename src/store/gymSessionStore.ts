import { create } from 'zustand';
import type { Exercise, GymSessionExercise, PlannedSet } from '@/firebase/types';
import { Timestamp } from 'firebase/firestore';
import { createGymSession, calculateTotalVolume } from '@/firebase/gymSessions';
import { logger } from '@/utils/logger';
import { useUserStore } from './userStore';

export type GymPhase = 'idle' | 'plan' | 'execute';

interface GymSessionState {
  // État
  phase: GymPhase;
  exercises: GymSessionExercise[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  startTime: number | null;
  duration: number; // secondes, mis à jour pendant l'exécution
  restDuration: number; // durée repos entre sets (secondes)
  showRestTimer: boolean;

  // Actions — Planning
  startPlanning: () => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string, set: Omit<PlannedSet, 'completed'>) => void;
  updateSet: (exerciseId: string, setIndex: number, partial: Partial<Omit<PlannedSet, 'completed'>>) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  duplicateLastSet: (exerciseId: string) => void;

  // Actions — Exécution
  startExecution: () => void;
  completeSet: (actualReps?: number, actualWeight?: number) => void;
  dismissRestTimer: () => void;
  goToNextSet: () => void;
  setRestDuration: (seconds: number) => void;
  endSession: () => Promise<void>;
  cancelSession: () => void;

  // Utilitaires
  getCurrentExercise: () => GymSessionExercise | undefined;
  getCurrentSet: () => PlannedSet | undefined;
  getTotalSets: () => number;
  getCompletedSets: () => number;
  hasExercise: (exerciseId: string) => boolean;

  // Templates
  loadGymTemplate: (exercises: GymSessionExercise[]) => void;
}

export const useGymSessionStore = create<GymSessionState>((set, get) => ({
  phase: 'idle',
  exercises: [],
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  startTime: null,
  duration: 0,
  restDuration: 90, // 90 secondes par défaut
  showRestTimer: false,

  // ─── Planning ─────────────────────────────────────────────────────────

  startPlanning: () => {
    set({ phase: 'plan', exercises: [], currentExerciseIndex: 0, currentSetIndex: 0 });
  },

  addExercise: (exercise: Exercise) => {
    const { exercises } = get();
    if (exercises.some((ex) => ex.exerciseId === exercise.id)) return;

    const newExercise: GymSessionExercise = {
      exerciseId: exercise.id,
      name: exercise.name,
      emoji: exercise.emoji,
      imageUrl: exercise.imageUrl,
      sets: [],
    };
    set({ exercises: [...exercises, newExercise] });
  },

  removeExercise: (exerciseId: string) => {
    set((state) => ({
      exercises: state.exercises.filter((ex) => ex.exerciseId !== exerciseId),
    }));
  },

  addSet: (exerciseId: string, setData: Omit<PlannedSet, 'completed'>) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, sets: [...ex.sets, { ...setData, completed: false }] }
          : ex
      ),
    }));
  },

  updateSet: (exerciseId: string, setIndex: number, partial: Partial<Omit<PlannedSet, 'completed'>>) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, ...partial } : s)),
            }
          : ex
      ),
    }));
  },

  removeSet: (exerciseId: string, setIndex: number) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) }
          : ex
      ),
    }));
  },

  duplicateLastSet: (exerciseId: string) => {
    const { exercises } = get();
    const exercise = exercises.find((ex) => ex.exerciseId === exerciseId);
    if (!exercise || exercise.sets.length === 0) return;

    const lastSet = exercise.sets[exercise.sets.length - 1];
    if (!lastSet) return;

    get().addSet(exerciseId, {
      weight: lastSet.actualWeight ?? lastSet.weight,
      reps: lastSet.actualReps ?? lastSet.reps,
    });
  },

  // ─── Exécution ────────────────────────────────────────────────────────

  startExecution: () => {
    const { exercises } = get();
    if (exercises.length === 0) return;
    // Vérifier que chaque exercice a au moins un set
    const hasAllSets = exercises.every((ex) => ex.sets.length > 0);
    if (!hasAllSets) return;

    set({
      phase: 'execute',
      startTime: Date.now(),
      duration: 0,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
    });
  },

  completeSet: (actualReps?: number, actualWeight?: number) => {
    const { exercises, currentExerciseIndex, currentSetIndex } = get();
    const exercise = exercises[currentExerciseIndex];
    if (!exercise) return;

    // Marquer le set comme complété avec les valeurs réelles
    const updatedExercises = exercises.map((ex, ei) =>
      ei === currentExerciseIndex
        ? {
            ...ex,
            sets: ex.sets.map((s, si) =>
              si === currentSetIndex
                ? {
                    ...s,
                    completed: true,
                    actualReps: actualReps ?? s.reps,
                    actualWeight: actualWeight ?? s.weight,
                  }
                : s
            ),
          }
        : ex
    );

    set({ exercises: updatedExercises, showRestTimer: true });
  },

  dismissRestTimer: () => {
    set({ showRestTimer: false });
    get().goToNextSet();
  },

  goToNextSet: () => {
    const { exercises, currentExerciseIndex, currentSetIndex } = get();
    const exercise = exercises[currentExerciseIndex];
    if (!exercise) return;

    const isLastSetOfExercise = currentSetIndex >= exercise.sets.length - 1;
    const isLastExercise = currentExerciseIndex >= exercises.length - 1;

    if (!isLastSetOfExercise) {
      // Prochain set du même exercice
      set({ currentSetIndex: currentSetIndex + 1, showRestTimer: false });
    } else if (!isLastExercise) {
      // Prochain exercice
      set({
        currentExerciseIndex: currentExerciseIndex + 1,
        currentSetIndex: 0,
        showRestTimer: false,
      });
    } else {
      // Séance terminée
      set({ showRestTimer: false });
    }
  },

  setRestDuration: (seconds: number) => {
    set({ restDuration: seconds });
  },

  endSession: async () => {
    try {
      const { startTime, exercises } = get();
      const { currentUser } = useUserStore.getState();
      if (!currentUser || !startTime) return;

      const duration = Math.floor((Date.now() - startTime) / 1000);
      const totalVolume = calculateTotalVolume(exercises);
      const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);

      await createGymSession(currentUser.uid, {
        userId: currentUser.uid,
        date: Timestamp.now(),
        duration,
        exercises,
        totalVolume: Math.round(totalVolume),
        totalSets,
      });

      get().cancelSession();
    } catch (error) {
      logger.error('Erreur lors de la fin de séance muscu:', error as Error);
      throw error;
    }
  },

  cancelSession: () => {
    set({
      phase: 'idle',
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startTime: null,
      duration: 0,
      showRestTimer: false,
    });
  },

  // ─── Utilitaires ──────────────────────────────────────────────────────

  getCurrentExercise: () => {
    const { exercises, currentExerciseIndex } = get();
    return exercises[currentExerciseIndex];
  },

  getCurrentSet: () => {
    const { exercises, currentExerciseIndex, currentSetIndex } = get();
    return exercises[currentExerciseIndex]?.sets[currentSetIndex];
  },

  getTotalSets: () => {
    return get().exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  },

  getCompletedSets: () => {
    return get().exercises.reduce(
      (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
      0
    );
  },

  hasExercise: (exerciseId: string) => {
    return get().exercises.some((ex) => ex.exerciseId === exerciseId);
  },

  loadGymTemplate: (exercises: GymSessionExercise[]) => {
    set({
      phase: 'plan',
      exercises,
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startTime: null,
      duration: 0,
      showRestTimer: false,
    });
  },
}));
