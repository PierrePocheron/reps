import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveCurrentSessionToLocal,
  getCurrentSessionFromLocal,
  clearCurrentSessionFromLocal,
  isOffline,
  onNetworkChange,
  queuedIfOffline,
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

});

describe('queuedIfOffline', () => {
  it("rend la valeur de l'écriture acquittée à temps", async () => {
    await expect(queuedIfOffline(Promise.resolve('id'), 50)).resolves.toBe('id');
  });

  it('propage un refus immédiat', async () => {
    await expect(queuedIfOffline(Promise.reject(new Error('refus')), 50)).rejects.toThrow('refus');
  });

  it("rend la main hors ligne (pas d'acquittement) sans attendre le réseau", async () => {
    vi.useFakeTimers();
    const pending = queuedIfOffline(new Promise<string>(() => {}), 4000);
    vi.advanceTimersByTime(4000);
    await expect(pending).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});
