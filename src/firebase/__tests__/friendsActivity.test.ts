import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs, query, where } from 'firebase/firestore';
import { getFriendsActivity, getLeaderboardStats } from '../firestore';

// Firestore `in` takes at most 30 values: each query answers for the friends it was given
beforeEach(() => {
  vi.mocked(where).mockImplementation(((field: string, op: string, value: unknown) => ({ field, op, value })) as never);
  vi.mocked(query).mockImplementation(((...parts: unknown[]) => parts) as never);
  vi.mocked(getDocs).mockImplementation((async (q: unknown) => {
    const ids = ((q as { op?: string; value?: string[] }[]).find((p) => p?.op === 'in')?.value) ?? [];
    return { docs: ids.map((uid, i) => ({ id: `${uid}-s`, data: () => ({ userId: uid, createdAt: { toDate: () => new Date(2026, 9, 4, 8, i) } }) })) };
  }) as never);
});

describe('getFriendsActivity', () => {
  it('covers every friend, not just the first 10', async () => {
    const friends = Array.from({ length: 12 }, (_, i) => `f${i + 1}`);
    const items = await getFriendsActivity(friends, 50);
    const users = new Set(items.map((a) => (a as { userId?: string }).userId));
    expect(users.has('f11')).toBe(true);
    expect(users.has('f12')).toBe(true);
  });

  it('one malformed doc does not break the whole feed', async () => {
    const at = (min: number) => ({ toDate: () => new Date(2026, 9, 4, 8, min) });
    const d = (id: string, data: Record<string, unknown>) => ({ id, data: () => ({ userId: 'f1', ...data }) });
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ docs: [d('bad-date', { createdAt: 'zzz', exercises: [] }), d('bad-exos', { createdAt: at(2), exercises: 'x' }), d('ok', { createdAt: at(1), exercises: [] })] } as never)
      .mockResolvedValueOnce({ docs: [d('badge', { createdAt: { a: 1 } })] } as never);
    const items = await getFriendsActivity(['f1']);
    expect(items.map((a) => a.sessionId ?? a.id)).toEqual(['bad-exos', 'ok']); // no valid date: skipped
    expect(items[0]!.exercises).toEqual([]); // not a list: no exercise lines rather than a crash on render
  });

  it('orders by the date the card shows: a forgotten session saved now sits at its own day, not on top', async () => {
    const at = (day: number, hour: number) => ({ toDate: () => new Date(2026, 9, day, hour) });
    const d = (id: string, data: Record<string, unknown>) => ({ id, data: () => ({ userId: 'f1', exercises: [], ...data }) });
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ docs: [d('forgotten', { date: at(3, 9), createdAt: at(7, 22) }), d('today', { date: at(7, 20), createdAt: at(7, 20) })] } as never)
      .mockResolvedValueOnce({ docs: [d('badge', { type: 'badge_unlocked', createdAt: at(5, 8) })] } as never);
    const items = await getFriendsActivity(['f1']);
    expect(items.map((a) => a.sessionId ?? a.id)).toEqual(['today', 'badge', 'forgotten']);
  });

  it('one « new friend » card per pair (the latest), none for a friendship removed since', async () => {
    const at = (min: number) => ({ toDate: () => new Date(2026, 9, 4, 8, min) });
    const ev = (id: string, friendId: string, min: number) => ({ id, data: () => ({ type: 'new_friend', userId: 'f1', friendId, createdAt: at(min) }) });
    const authors = [{ id: 'f1', data: () => ({ friends: ['alice'] }) }];
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ docs: [] } as never)
      .mockResolvedValueOnce({ docs: [ev('readded', 'alice', 3), ev('gone', 'bob', 2), ev('first', 'alice', 1)] } as never)
      .mockResolvedValueOnce({ docs: authors, forEach: (fn: (d: unknown) => void) => authors.forEach(fn) } as never);
    const items = await getFriendsActivity(['f1']);
    expect(items.map((a) => a.id)).toEqual(['readded']);
  });

  it('a read failure is an error, not an empty feed', async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error('offline'));
    await expect(getFriendsActivity(['f1'])).rejects.toThrow('offline');
  });
});

describe('friend queries', () => {
  it('ask for up to 30 friends per query, the most `in` accepts', async () => {
    const friends = Array.from({ length: 31 }, (_, i) => `f${i + 1}`);
    vi.mocked(getDocs).mockClear().mockResolvedValue({ docs: [], forEach: () => {} } as never);
    await getFriendsActivity(friends);
    await getLeaderboardStats(friends, 'weekly');
    const sizes = vi.mocked(getDocs).mock.calls.map(([q]) => (q as unknown as { op?: string; value?: string[] }[]).find((p) => p?.op === 'in')?.value?.length);
    expect(sizes).toEqual([30, 1, 30, 1, 30, 1]); // feed sessions, feed badges, leaderboard
  });
});
