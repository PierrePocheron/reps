import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Exercise, GymSessionExercise, PlannedSet } from '@/firebase/types';
import { Timestamp } from 'firebase/firestore';
import { createGymSession, calculateTotalVolume, sanitizeExercises, NOTE_MAX } from '@/firebase/gymSessions';
import { updateUserStatsAfterSession } from '@/firebase/firestore';
import { isWorkSet, isTimed } from '@/utils/records';
import { toggleSupersetLink, swapWithNext } from '@/utils/superset';
import { logger } from '@/utils/logger';
import { scheduleRestEnd, cancelRestEnd } from '@/utils/restNotification';
import { useUserStore } from './userStore';

export type GymPhase = 'idle' | 'plan' | 'execute';
export { NOTE_MAX };

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
  restEndsAt: number | null; // horodatage de fin du repos (le décompte en dérive)
  restExerciseId: string | null; // exercice dont le repos est en cours (null : repos lancé à la main)
  restByExercise: Record<string, number>; // durée retenue par exercice, comme Hevy (préférence, persistée)
  autoRest: boolean; // lancer le repos quand une série est validée (préférence, persistée)
  showRpe: boolean; // saisir le RPE des séries validées (préférence, persistée)
  suggestLoad: boolean; // proposer la charge suivante quand tout a été réussi (préférence, persistée)
  backdate: { at: number; duration: number } | null; // séance oubliée (#58) : date passée et durée (s) saisies
  title: string;       // titre de la séance (#64), repris du modèle
  sessionNote: string; // note de séance (#64)

  // Actions — Planning
  startPlanning: () => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: string) => void;
  addSet: (exerciseId: string, set: Omit<PlannedSet, 'completed'>) => void;
  updateSet: (exerciseId: string, setIndex: number, partial: Partial<Omit<PlannedSet, 'completed'>>) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  duplicateLastSet: (exerciseId: string) => void;
  prependWarmup: (exerciseId: string, sets: { weight: number; reps: number }[]) => void;
  toggleSuperset: (index: number) => void;
  swapExercises: (index: number) => void;
  toggleTimed: (exerciseId: string) => void;
  replaceExercise: (exerciseId: string, by: Exercise) => void;
  setExerciseNote: (exerciseId: string, note: string) => void;

  // Actions — Exécution
  startExecution: () => void;
  completeSetAt: (exerciseId: string, setIndex: number, actualReps: number, actualWeight: number) => void;
  startRestTimer: (exerciseId?: string) => void;
  dismissRestTimer: () => void;
  setRestDuration: (seconds: number) => void;
  adjustRest: (deltaSeconds: number) => void;
  setAutoRest: (on: boolean) => void;
  setShowRpe: (on: boolean) => void;
  setSuggestLoad: (on: boolean) => void;
  setBackdate: (backdate: { at: number; duration: number } | null) => void;
  setTitle: (title: string) => void;
  setSessionNote: (note: string) => void;
  endSession: () => Promise<void>;
  cancelSession: () => void;

  // Utilitaires
  getTotalSets: () => number;
  getCompletedSets: () => number;
  hasExercise: (exerciseId: string) => boolean;

  // Templates
  loadGymTemplate: (exercises: GymSessionExercise[], title?: string) => void;

  // Séance libre — démarre directement en execute sans exercices
  startFreeSession: () => void;
}

// Persisté en localStorage : une séance en cours survit à un rechargement ou à
// l'arrêt de la WebView par Android (terminer/annuler la remet à « idle »).
/** Durée du repos : celle retenue pour l'exercice, sinon la durée par défaut. */
export const restSeconds = (s: Pick<GymSessionState, 'restDuration' | 'restByExercise'>, exerciseId: string | null) =>
  (exerciseId && s.restByExercise[exerciseId]) || s.restDuration;

export const useGymSessionStore = create<GymSessionState>()(persist((set, get) => ({
  phase: 'idle',
  exercises: [],
  currentExerciseIndex: 0,
  currentSetIndex: 0,
  startTime: null,
  duration: 0,
  restDuration: 90, // 90 secondes par défaut
  showRestTimer: false,
  restEndsAt: null,
  restExerciseId: null,
  restByExercise: {},
  autoRest: true,
  showRpe: false,
  suggestLoad: true,
  backdate: null,
  title: '',
  sessionNote: '',

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

  prependWarmup: (exerciseId: string, sets: { weight: number; reps: number }[]) => {
    const warmup: PlannedSet[] = sets.map((s) => ({ ...s, completed: false, type: 'warmup' }));
    set((state) => ({
      exercises: state.exercises.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, sets: [...warmup, ...ex.sets] } : ex)),
    }));
  },

  toggleSuperset: (index: number) => set((state) => ({ exercises: toggleSupersetLink(state.exercises, index) })),
  swapExercises: (index: number) => set((state) => ({ exercises: swapWithNext(state.exercises, index) })),
  // Machine prise (#62, Hevy « Replace exercise ») : séries, superset et place gardés ; note, unité et trophées propres à l'ancien
  replaceExercise: (exerciseId: string, by: Exercise) => set((state) => (state.exercises.some((ex) => ex.exerciseId === by.id) ? state : {
    exercises: state.exercises.map((ex) => (ex.exerciseId !== exerciseId ? ex : {
      ...ex, exerciseId: by.id, name: by.name, emoji: by.emoji, imageUrl: by.imageUrl, note: undefined, timed: undefined,
      sets: ex.sets.map((s) => ({ ...s, isRecord: false })),
    })),
  })),
  toggleTimed: (exerciseId: string) => set((state) => ({ exercises: state.exercises.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, timed: !isTimed(ex) } : ex)) })),

  setExerciseNote: (exerciseId: string, note: string) => {
    set((state) => ({
      exercises: state.exercises.map((ex) => (ex.exerciseId === exerciseId ? { ...ex, note: note.slice(0, NOTE_MAX) } : ex)),
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

  startRestTimer: (exerciseId) => {
    const restEndsAt = Date.now() + restSeconds(get(), exerciseId ?? null) * 1000;
    set({ showRestTimer: true, restEndsAt, restExerciseId: exerciseId ?? null });
    void scheduleRestEnd(restEndsAt);
  },

  dismissRestTimer: () => {
    const { restEndsAt } = get();
    set({ showRestTimer: false, restEndsAt: null });
    // Arrêté avant la fin : on annule. Fini tout seul : la notification doit rester (le décompte JS tourne
    // encore en arrière-plan et la retirait 140 ms après son affichage sur l'écran verrouillé)
    if (restEndsAt && Date.now() < restEndsAt) cancelRestEnd();
  },

  setRestDuration: (seconds: number) => {
    const { showRestTimer, restExerciseId: id } = get();
    // Pendant le repos d'un exercice : durée retenue pour lui ; sinon durée par défaut
    if (showRestTimer && id) set((s) => ({ restByExercise: { ...s.restByExercise, [id]: seconds } }));
    else set({ restDuration: seconds });
    if (showRestTimer) get().startRestTimer(id ?? undefined); // changer la durée relance le repos
  },

  // −15 s / +15 s (Strong) : décale la fin sans relancer le décompte, jamais avant maintenant
  adjustRest: (deltaSeconds: number) => {
    const { restEndsAt } = get();
    if (!restEndsAt) return;
    const next = Math.max(Date.now(), restEndsAt + deltaSeconds * 1000);
    set({ restEndsAt: next });
    void scheduleRestEnd(next);
  },

  setAutoRest: (on: boolean) => set({ autoRest: on }),
  setShowRpe: (on: boolean) => set({ showRpe: on }),
  setSuggestLoad: (on: boolean) => set({ suggestLoad: on }),
  // Jamais dans le futur : la date est ramenée à maintenant au pire
  setTitle: (title) => set({ title: title.slice(0, 60) }),
  setSessionNote: (sessionNote) => set({ sessionNote: sessionNote.slice(0, NOTE_MAX) }),
  setBackdate: (backdate) => set({ backdate: backdate && { at: Math.min(backdate.at, Date.now()), duration: Math.max(0, backdate.duration) } }),

  endSession: async () => {
    try {
      const { startTime, exercises } = get();
      const { currentUser } = useUserStore.getState();
      if (!currentUser || !startTime) return;

      const { backdate } = get();
      const duration = backdate ? backdate.duration : Math.floor((Date.now() - startTime) / 1000);
      const totalVolume = calculateTotalVolume(exercises);
      const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.filter(isWorkSet).length, 0);

      const sanitizedExercises = sanitizeExercises(exercises);

      await createGymSession(currentUser.uid, {
        userId: currentUser.uid,
        date: backdate ? Timestamp.fromDate(new Date(backdate.at)) : Timestamp.now(),
        ...(get().title.trim() ? { title: get().title.trim() } : {}),
        ...(get().sessionNote.trim() ? { note: get().sessionNote.trim() } : {}),
        duration,
        exercises: sanitizedExercises,
        totalVolume: Math.round(totalVolume),
        totalSets,
      });
      // Série et badges comptent aussi la muscu ; un échec ne doit pas bloquer la fin de séance
      await updateUserStatsAfterSession(currentUser.uid, 0)
        .catch((err) => logger.error('Mise à jour des stats après séance muscu :', err));

      get().cancelSession();
    } catch (error) {
      logger.error('Erreur lors de la fin de séance muscu:', error as Error);
      throw error;
    }
  },

  cancelSession: () => {
    cancelRestEnd();
    set({
      phase: 'idle',
      exercises: [],
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startTime: null,
      duration: 0,
      showRestTimer: false,
      restEndsAt: null,
      backdate: null,
      title: '',
      sessionNote: '',
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
    if (get().phase !== 'idle') return; // a session in progress is resumed, never wiped (every caller then opens /gym)
    set({
      phase: 'execute',
      exercises: [],
      title: '',
      sessionNote: '',
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startTime: Date.now(),
      duration: 0,
      showRestTimer: false,
    });
  },

  loadGymTemplate: (exercises: GymSessionExercise[], title = '') => {
    set({
      phase: 'plan',
      exercises,
      title,
      sessionNote: '',
      currentExerciseIndex: 0,
      currentSetIndex: 0,
      startTime: null,
      duration: 0,
      showRestTimer: false,
    });
  },
}), {
  name: 'reps_gym_session',
  partialize: (s) => ({
    phase: s.phase,
    exercises: s.exercises,
    currentExerciseIndex: s.currentExerciseIndex,
    currentSetIndex: s.currentSetIndex,
    startTime: s.startTime,
    restDuration: s.restDuration,
    restByExercise: s.restByExercise,
    autoRest: s.autoRest,
    showRpe: s.showRpe,
    suggestLoad: s.suggestLoad,
    backdate: s.backdate,
    title: s.title,
    sessionNote: s.sessionNote,
  }),
}));
