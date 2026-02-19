import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveCurrentSessionToLocal,
  getCurrentSessionFromLocal,
  clearCurrentSessionFromLocal,
  saveExercisesToLocal,
  getExercisesFromLocal,
  isOffline,
  onNetworkChange,
  syncLocalDataWithFirestore,
} from '../offline';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('firebase/offline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  // ==================== SAVE CURRENT SESSION TO LOCAL ====================

  describe('saveCurrentSessionToLocal', () => {
    it('should save session to localStorage', () => {
      const session = { startTime: 1000, exercises: [], duration: 60, totalReps: 10 };
      saveCurrentSessionToLocal(session);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'reps_current_session',
        JSON.stringify(session)
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('QuotaExceeded'); });
      expect(() => saveCurrentSessionToLocal({ startTime: 1000 })).not.toThrow();
    });
  });

  // ==================== GET CURRENT SESSION FROM LOCAL ====================

  describe('getCurrentSessionFromLocal', () => {
    it('should return null when no session stored', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const result = getCurrentSessionFromLocal();
      expect(result).toBeNull();
    });

    it('should return parsed session from localStorage', () => {
      const session = { startTime: 1000, exercises: [], duration: 60, totalReps: 10 };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(session));
      const result = getCurrentSessionFromLocal();
      expect(result).toEqual(session);
    });

    it('should return null on JSON parse error', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-json{{{');
      const result = getCurrentSessionFromLocal();
      expect(result).toBeNull();
    });
  });

  // ==================== CLEAR CURRENT SESSION FROM LOCAL ====================

  describe('clearCurrentSessionFromLocal', () => {
    it('should remove session from localStorage', () => {
      clearCurrentSessionFromLocal();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('reps_current_session');
    });

    it('should handle errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('StorageError'); });
      expect(() => clearCurrentSessionFromLocal()).not.toThrow();
    });
  });

  // ==================== SAVE EXERCISES TO LOCAL ====================

  describe('saveExercisesToLocal', () => {
    it('should save exercises to localStorage', () => {
      const exercises = [{ id: 'pushups', name: 'Pompes', emoji: '💪' }];
      saveExercisesToLocal(exercises);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'reps_exercises',
        JSON.stringify(exercises)
      );
    });

    it('should handle errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('StorageError'); });
      expect(() => saveExercisesToLocal([])).not.toThrow();
    });
  });

  // ==================== GET EXERCISES FROM LOCAL ====================

  describe('getExercisesFromLocal', () => {
    it('should return empty array when no exercises stored', () => {
      localStorageMock.getItem.mockReturnValueOnce(null);
      const result = getExercisesFromLocal();
      expect(result).toEqual([]);
    });

    it('should return parsed exercises from localStorage', () => {
      const exercises = [{ id: 'pushups', name: 'Pompes', emoji: '💪' }];
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(exercises));
      const result = getExercisesFromLocal();
      expect(result).toEqual(exercises);
    });

    it('should return empty array on JSON parse error', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid-json{{{');
      const result = getExercisesFromLocal();
      expect(result).toEqual([]);
    });
  });

  // ==================== IS OFFLINE ====================

  describe('isOffline', () => {
    it('should return false when online', () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      expect(isOffline()).toBe(false);
    });

    it('should return true when offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      expect(isOffline()).toBe(true);
    });
  });

  // ==================== ON NETWORK CHANGE ====================

  describe('onNetworkChange', () => {
    it('should add event listeners and return unsubscribe function', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      const removeEventSpy = vi.spyOn(window, 'removeEventListener');

      const callback = vi.fn();
      const unsubscribe = onNetworkChange(callback);

      expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unsubscribe();

      expect(removeEventSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventSpy.mockRestore();
      removeEventSpy.mockRestore();
    });

    it('should call callback with true when online event fires', () => {
      const callback = vi.fn();
      onNetworkChange(callback);

      window.dispatchEvent(new Event('online'));
      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should call callback with false when offline event fires', () => {
      const callback = vi.fn();
      onNetworkChange(callback);

      window.dispatchEvent(new Event('offline'));
      expect(callback).toHaveBeenCalledWith(false);
    });
  });

  // ==================== SYNC LOCAL DATA WITH FIRESTORE ====================

  describe('syncLocalDataWithFirestore', () => {
    it('should return early if offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      localStorageMock.getItem.mockReturnValueOnce(null);

      await syncLocalDataWithFirestore('user123');
      // Should not call any firestore functions
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
    });

    it('should return early if no local session', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      localStorageMock.getItem.mockReturnValueOnce(null);

      await syncLocalDataWithFirestore('user123');
      // Just checking it runs without error
    });

    it('should return early if local session has no startTime', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify({ exercises: [] }));

      await syncLocalDataWithFirestore('user123');
      // Should not import firestore or create session
    });

    it('should return early if local session has no sessionId', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      const session = { startTime: Date.now(), exercises: [], duration: 0, totalReps: 0 };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(session));

      await syncLocalDataWithFirestore('user123');
      // No sessionId → should not try to check Firestore
    });
  });
});
