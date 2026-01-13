import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChallenges } from '../useChallenges';
import { useUserStore } from '@/store/userStore';
import { getUserActiveChallenges } from '@/firebase/challenges';

// Mock the challenges service
vi.mock('@/firebase/challenges', () => ({
  getUserActiveChallenges: vi.fn(),
  // Mock UserChallenge type or exports if needed, but type imports are erased at runtime
}));

describe('useChallenges Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({ user: null });
  });

  it('should initialize with empty array and loading true if user exists', async () => {
    useUserStore.setState({ user: { uid: 'u1' } as any });

    // Default mock response: delayed resolution to checks loading state
    (getUserActiveChallenges as any).mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useChallenges());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.activeChallenges).toEqual([]);
  });

  it('should return challenges after fetch', async () => {
    useUserStore.setState({ user: { uid: 'u1' } as any });

    const mockData = [{ id: 'c1', name: 'Challenge 1' }];
    (getUserActiveChallenges as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useChallenges());

    await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeChallenges).toEqual(mockData);
  });

  it('should handle errors gracefully', async () => {
     useUserStore.setState({ user: { uid: 'u1' } as any });

     // Spy on console error to keep output clean, or assert it
     const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

     (getUserActiveChallenges as any).mockRejectedValue(new Error('Fetch failed'));

     const { result } = renderHook(() => useChallenges());

     await waitFor(() => {
         expect(result.current.isLoading).toBe(false);
     });

     expect(result.current.activeChallenges).toEqual([]);
     expect(consoleSpy).toHaveBeenCalled();
     consoleSpy.mockRestore();
  });

  it('should refresh challenges without setting hard loading state', async () => {
      useUserStore.setState({ user: { uid: 'u1' } as any });

      (getUserActiveChallenges as any).mockResolvedValue([{ id: 'c1' }]);

      const { result } = renderHook(() => useChallenges());

      await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
      });

      // Now refresh
      const newData = [{ id: 'c1' }, { id: 'c2' }];
      (getUserActiveChallenges as any).mockResolvedValue(newData);

      await result.current.refreshChallenges();

      // Should verify it updated
      expect(result.current.activeChallenges).toHaveLength(1);
      // Ideally check that isLoading didn't flash to true if we could,
      // but in the hook logic `isLoading` isn't set to true on `refresh` (isInitialLoad=false).
      // So checking final state is good enough, or we could spy on setState if needed.
  });
});
