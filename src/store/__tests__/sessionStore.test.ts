import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessionStore } from '../sessionStore';
import * as firebaseModule from '@/firebase';
import * as userStoreModule from '../userStore';

// Mock firebase module
vi.mock('@/firebase', () => ({
  createSession: vi.fn().mockResolvedValue('session-id'),
  updateUserStatsAfterSession: vi.fn().mockResolvedValue(undefined),
  saveCurrentSessionToLocal: vi.fn(),
  getCurrentSessionFromLocal: vi.fn().mockReturnValue(null),
  clearCurrentSessionFromLocal: vi.fn(),
}));

// Mock userStore
vi.mock('../userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      currentUser: { uid: 'uid123' },
      user: { uid: 'uid123', weight: 70, height: 175, gender: 'male' },
      refreshStats: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

const resetStore = () => {
  useSessionStore.setState({
    isActive: false,
    startTime: null,
    exercises: [],
    duration: 0,
    totalReps: 0,
  });
};

describe('sessionStore', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  // ==================== INITIAL STATE ====================

  it('should have correct initial state', () => {
    const state = useSessionStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.startTime).toBeNull();
    expect(state.exercises).toEqual([]);
    expect(state.duration).toBe(0);
    expect(state.totalReps).toBe(0);
  });

  // ==================== START SESSION ====================

  describe('startSession', () => {
    it('should set isActive to true', () => {
      useSessionStore.getState().startSession();
      expect(useSessionStore.getState().isActive).toBe(true);
    });

    it('should set a startTime', () => {
      const before = Date.now();
      useSessionStore.getState().startSession();
      const { startTime } = useSessionStore.getState();
      expect(startTime).not.toBeNull();
      expect(startTime).toBeGreaterThanOrEqual(before);
    });

    it('should reset exercises and reps', () => {
      useSessionStore.setState({ exercises: [{ name: 'Pompes', emoji: '🔥', reps: 10 }], totalReps: 10 });
      useSessionStore.getState().startSession();
      expect(useSessionStore.getState().exercises).toEqual([]);
      expect(useSessionStore.getState().totalReps).toBe(0);
    });
  });

  // ==================== ADD EXERCISE ====================

  describe('addExercise', () => {
    it('should add an exercise to the session', () => {
      useSessionStore.getState().addExercise({ id: 'pushups', name: 'Pompes', emoji: '🔥' } as any);
      expect(useSessionStore.getState().exercises).toHaveLength(1);
      expect(useSessionStore.getState().exercises[0].name).toBe('Pompes');
      expect(useSessionStore.getState().exercises[0].reps).toBe(0);
    });

    it('should not add the same exercise twice', () => {
      const exercise = { id: 'pushups', name: 'Pompes', emoji: '🔥' } as any;
      useSessionStore.getState().addExercise(exercise);
      useSessionStore.getState().addExercise(exercise);
      expect(useSessionStore.getState().exercises).toHaveLength(1);
    });

    it('should add multiple different exercises', () => {
      useSessionStore.getState().addExercise({ id: 'pushups', name: 'Pompes', emoji: '🔥' } as any);
      useSessionStore.getState().addExercise({ id: 'squats', name: 'Squats', emoji: '🦵' } as any);
      expect(useSessionStore.getState().exercises).toHaveLength(2);
    });
  });

  // ==================== REMOVE EXERCISE ====================

  describe('removeExercise', () => {
    it('should remove an exercise by name', () => {
      useSessionStore.setState({
        exercises: [
          { name: 'Pompes', emoji: '🔥', reps: 10 },
          { name: 'Squats', emoji: '🦵', reps: 5 },
        ],
        totalReps: 15,
      });
      useSessionStore.getState().removeExercise('Pompes');
      expect(useSessionStore.getState().exercises).toHaveLength(1);
      expect(useSessionStore.getState().exercises[0].name).toBe('Squats');
    });

    it('should recalculate totalReps after removal', () => {
      useSessionStore.setState({
        exercises: [
          { name: 'Pompes', emoji: '🔥', reps: 10 },
          { name: 'Squats', emoji: '🦵', reps: 5 },
        ],
        totalReps: 15,
      });
      useSessionStore.getState().removeExercise('Pompes');
      expect(useSessionStore.getState().totalReps).toBe(5);
    });
  });

  // ==================== ADD REPS ====================

  describe('addReps', () => {
    it('should add reps to an existing exercise', () => {
      useSessionStore.setState({
        isActive: true,
        startTime: Date.now(),
        exercises: [{ name: 'Pompes', emoji: '🔥', reps: 5 }],
        totalReps: 5,
      });
      useSessionStore.getState().addReps('Pompes', 10);
      expect(useSessionStore.getState().exercises[0].reps).toBe(15);
      expect(useSessionStore.getState().totalReps).toBe(15);
    });

    it('should not affect other exercises when adding reps', () => {
      useSessionStore.setState({
        isActive: true,
        startTime: Date.now(),
        exercises: [
          { name: 'Pompes', emoji: '🔥', reps: 5 },
          { name: 'Squats', emoji: '🦵', reps: 3 },
        ],
        totalReps: 8,
      });
      useSessionStore.getState().addReps('Pompes', 5);
      expect(useSessionStore.getState().exercises[1].reps).toBe(3);
      expect(useSessionStore.getState().totalReps).toBe(13);
    });
  });

  // ==================== RESET SESSION ====================

  describe('resetSession', () => {
    it('should reset all session state', () => {
      useSessionStore.setState({
        isActive: true,
        startTime: Date.now(),
        exercises: [{ name: 'Pompes', emoji: '🔥', reps: 20 }],
        duration: 300,
        totalReps: 20,
      });
      useSessionStore.getState().resetSession();
      const state = useSessionStore.getState();
      expect(state.isActive).toBe(false);
      expect(state.startTime).toBeNull();
      expect(state.exercises).toEqual([]);
      expect(state.duration).toBe(0);
      expect(state.totalReps).toBe(0);
    });
  });

  // ==================== GET EXERCISE REPS ====================

  describe('getExerciseReps', () => {
    it('should return reps for an existing exercise', () => {
      useSessionStore.setState({
        exercises: [{ name: 'Pompes', emoji: '🔥', reps: 25 }],
      });
      const reps = useSessionStore.getState().getExerciseReps('Pompes');
      expect(reps).toBe(25);
    });

    it('should return 0 for an exercise that does not exist', () => {
      const reps = useSessionStore.getState().getExerciseReps('Inconnu');
      expect(reps).toBe(0);
    });
  });

  // ==================== GET FORMATTED DURATION ====================

  describe('getFormattedDuration', () => {
    it('should format duration as MM:SS', () => {
      useSessionStore.setState({ isActive: false, duration: 125 });
      const formatted = useSessionStore.getState().getFormattedDuration();
      expect(formatted).toBe('02:05');
    });

    it('should return 00:00 for zero duration', () => {
      useSessionStore.setState({ isActive: false, duration: 0 });
      const formatted = useSessionStore.getState().getFormattedDuration();
      expect(formatted).toBe('00:00');
    });
  });

  // ==================== LOAD SESSION FROM LOCAL ====================

  describe('loadSessionFromLocal', () => {
    it('should not load session if no local session exists', () => {
      vi.mocked(firebaseModule.getCurrentSessionFromLocal).mockReturnValueOnce(null as any);
      useSessionStore.getState().loadSessionFromLocal();
      expect(useSessionStore.getState().isActive).toBe(false);
    });

    it('should load a valid recent session from localStorage', () => {
      const recentSession = {
        startTime: Date.now() - 60000, // 1 minute ago
        exercises: [{ name: 'Pompes', emoji: '🔥', reps: 10 }],
        duration: 60,
        totalReps: 10,
      };
      vi.mocked(firebaseModule.getCurrentSessionFromLocal).mockReturnValueOnce(recentSession as any);
      useSessionStore.getState().loadSessionFromLocal();
      expect(useSessionStore.getState().isActive).toBe(true);
      expect(useSessionStore.getState().exercises).toHaveLength(1);
    });

    it('should not load an expired session (> 24h)', () => {
      
      const oldSession = {
        startTime: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        exercises: [],
        duration: 0,
        totalReps: 0,
      };
      vi.mocked(firebaseModule.getCurrentSessionFromLocal).mockReturnValueOnce(oldSession as any);
      useSessionStore.getState().loadSessionFromLocal();
      expect(useSessionStore.getState().isActive).toBe(false);
      expect(firebaseModule.clearCurrentSessionFromLocal).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== END SESSION ====================

  describe('endSession', () => {
    it('should do nothing if session is not active', async () => {
      await useSessionStore.getState().endSession();
      expect(firebaseModule.createSession).not.toHaveBeenCalled();
    });

    it('should save session to Firestore and reset state', async () => {
      useSessionStore.setState({
        isActive: true,
        startTime: Date.now() - 5000,
        exercises: [{ name: 'Pompes', emoji: '🔥', reps: 20 }],
        totalReps: 20,
        duration: 5,
      });
      await useSessionStore.getState().endSession();
      expect(firebaseModule.createSession).toHaveBeenCalledTimes(1);
      expect(useSessionStore.getState().isActive).toBe(false);
    });

    it('should throw if no user is connected', async () => {
      
      vi.mocked(userStoreModule.useUserStore.getState).mockReturnValueOnce({ currentUser: null, user: null } as any);
      useSessionStore.setState({ isActive: true, startTime: Date.now() });
      await expect(useSessionStore.getState().endSession()).rejects.toThrow('Aucun utilisateur connecté');
    });
  });
});
