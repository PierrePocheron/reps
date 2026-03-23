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
  completeSetAt: (exerciseId: string, setIndex: number, actualReps: number, actualWeight: number) => void;
  startRestTimer: () => void;
  dismissRestTimer: () => void;
  setRestDuration: (seconds: number) => void;
  endSession: () => Promise<void>;
  cancelSession: () => void;

  // Utilitaires
  getTotalSets: () => number;
  getCompletedSets: () => number;
  hasExercise: (exerciseId: string) => boolean;

  // Templates
  loadGymTemplate: (exercises: GymSessionExercise[]) => void;

  // Séance libre — démarre directement en execute sans exercices
  startFreeSession: () => void;
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

  completeSetAt: (exerciseId: string, setIndex: number, actualReps: number, actualWeight: number) => {
    set((state) => ({
      exercises: state.exercises.map((ex) =>
        ex.exerciseId === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s, i) =>
                i === setIndex ? { ...s, completed: true, actualReps, actualWeight } : s
              ),
            }
          : ex
      ),
    }));
  },

  startRestTimer: () => {
    set({ showRestTimer: true });
  },

  dismissRestTimer: () => {
    set({ showRestTimer: false });
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

      // Firestore rejette les valeurs `undefined` — on les retire
      const sanitizedExercises = exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        emoji: ex.emoji,
        ...(ex.imageUrl ? { imageUrl: ex.imageUrl } : {}),
        sets: ex.sets.map((s) => ({
          reps: s.reps,
          weight: s.weight,
          completed: s.completed,
          ...(s.actualReps !== undefined ? { actualReps: s.actualReps } : {}),
          ...(s.actualWeight !== undefined ? { actualWeight: s.actualWeight } : {}),
        })),
      }));

      await createGymSession(currentUser.uid, {
        userId: currentUser.uid,
        date: Timestamp.now(),
        duration,
        exercises: sanitizedExercises,
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

  startFreeSession: () => {
    set({
      phase: 'execute',
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startTime: Date.now(),
      duration: 0,
      showRestTimer: false,
    });
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
