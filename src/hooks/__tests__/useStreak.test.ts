import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { useStreak } from '../useStreak';
import { useUserStore } from '@/store/userStore';
import type { User } from '@/firebase/types';

vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), updateUserStatsAfterSession: vi.fn().mockResolvedValue(undefined) }));
import { updateUserStatsAfterSession } from '@/firebase/firestore';

const setUser = (partial: Partial<User> | null) =>
  useUserStore.setState({ user: partial && ({ uid: 'u1', currentStreak: 0, longestStreak: 0, ...partial } as User) });

describe('useStreak', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ne fait rien sans utilisateur', () => {
    setUser(null);
    renderHook(() => useStreak());
    expect(updateUserStatsAfterSession).not.toHaveBeenCalled();
  });

  it('recalcule une seule fois la série d\'un compte qui ne l\'a jamais eue', () => {
    setUser({});
    const { rerender } = renderHook(() => useStreak());
    rerender();
    expect(updateUserStatsAfterSession).toHaveBeenCalledTimes(1);
    expect(updateUserStatsAfterSession).toHaveBeenCalledWith('u1', 0);
  });

  it('ne recalcule pas si la série est déjà à jour', () => {
    setUser({ lastTrainingDate: Timestamp.now(), weeklyStreak: 2 });
    renderHook(() => useStreak());
    setUser({ lastTrainingDate: null, weeklyStreak: 0 }); // compte sans séance : déjà calculé
    renderHook(() => useStreak());
    expect(updateUserStatsAfterSession).not.toHaveBeenCalled();
  });

  it('recalcule une fois les comptes sans série hebdomadaire (#45)', () => {
    setUser({ uid: 'u2', lastTrainingDate: Timestamp.now() });
    renderHook(() => useStreak());
    expect(updateUserStatsAfterSession).toHaveBeenCalledWith('u2', 0);
  });
});
