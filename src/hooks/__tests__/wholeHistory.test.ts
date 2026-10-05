import { describe, it, expect, vi } from 'vitest';

vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), getUserSessions: vi.fn(async () => []) }));
vi.mock('@/firebase/gymSessions', () => ({ getUserGymSessions: vi.fn(async () => []) }));

import { fetchWholeHistory } from '../useSessionHistory';
import { getUserSessions } from '@/firebase/firestore';
import { getUserGymSessions } from '@/firebase/gymSessions';

describe('fetchWholeHistory', () => {
  it('reads every session, not only the latest page (export « toutes tes données », import duplicates)', async () => {
    await fetchWholeHistory('u1');
    const renfoLimit = vi.mocked(getUserSessions).mock.calls[0]![1]!;
    const gymLimit = vi.mocked(getUserGymSessions).mock.calls[0]![1]!;
    expect(renfoLimit).toBeGreaterThanOrEqual(100_000); // was 500: older sessions missing from the export
    expect(gymLimit).toBeGreaterThanOrEqual(100_000);
  });

  it('reads from the server: offline, the partial local cache must not pass for the whole history', async () => {
    await fetchWholeHistory('u1');
    expect(vi.mocked(getUserSessions)).toHaveBeenLastCalledWith('u1', expect.any(Number), true);
    expect(vi.mocked(getUserGymSessions)).toHaveBeenLastCalledWith('u1', expect.any(Number), true);
  });
});
