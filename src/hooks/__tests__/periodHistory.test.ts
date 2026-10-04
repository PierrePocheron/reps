import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const renfo = [{ sessionId: 'r1' }];
const gym = [{ sessionId: 'g1' }];
vi.mock('@/firebase/firestore', () => ({ getUserSessions: vi.fn(), getUserSessionsBetween: vi.fn(async () => renfo) }));
vi.mock('@/firebase/gymSessions', () => ({ getUserGymSessions: vi.fn(), getUserGymSessionsBetween: vi.fn(async () => gym) }));
vi.mock('@/store/userStore', () => ({ useUserStore: () => ({ user: { uid: 'u1' } }) }));

import { usePeriodHistory } from '../useSessionHistory';
import { getUserSessionsBetween } from '@/firebase/firestore';
import { getUserGymSessionsBetween } from '@/firebase/gymSessions';

describe('usePeriodHistory', () => {
  it('reads exactly the period (a yearly recap must not stop at the latest 200 sessions)', async () => {
    const from = new Date(2025, 0, 1), to = new Date(2026, 0, 1);
    const { result } = renderHook(() => usePeriodHistory(from, to));
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(getUserSessionsBetween).toHaveBeenCalledWith('u1', from, to);
    expect(getUserGymSessionsBetween).toHaveBeenCalledWith('u1', from, to);
    expect(result.current.sessions).toEqual(renfo);
    expect(result.current.gymSessions).toEqual(gym);
  });
});
