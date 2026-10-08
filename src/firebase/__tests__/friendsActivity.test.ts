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

  it('whatever a friend wrote, every item is safe to render (one bad item took the Friends page down)', async () => {
    const at = (min: number) => ({ toDate: () => new Date(2026, 9, 4, 8, min) });
    const d = (id: string, data: Record<string, unknown>) => ({ id, data: () => ({ userId: 'f1', ...data }) });
    const authors = [{ id: 'f1', data: () => ({ friends: ['bob'] }) }];
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ docs: [
        d('bad-day', { createdAt: at(5), date: 'zzz', exercises: [] }),
        d('junk', { createdAt: at(4), date: at(4), sessionId: { a: 1 }, exercises: [null, 'x', { name: { a: 1 }, reps: 3 },
          { name: 'Squats', reps: '5' }, { name: 'Pompes', emoji: { a: 1 }, reps: 10 }] }), // no totalReps
      ] } as never)
      .mockResolvedValueOnce({ docs: [
        d('badge', { type: 'badge_unlocked', createdAt: at(3), badgeEmoji: { boom: 1 }, badgeName: 7 }),
        d('odd-friend', { type: 'new_friend', createdAt: at(2), friendId: { toString: 1 } }),
        d('bob', { type: 'new_friend', createdAt: at(1), friendId: 'bob', friendName: ['x'] }),
      ] } as never)
      .mockResolvedValueOnce({ docs: authors, forEach: (fn: (d: unknown) => void) => authors.forEach(fn) } as never);
    const items = await getFriendsActivity(['f1']);
    expect(items.map((a) => a.sessionId ?? a.id)).toEqual(['junk', 'badge', 'bob']);
    expect(items[0]).toMatchObject({ sessionId: 'junk', totalReps: 0, exercises: [{ name: 'Pompes', emoji: '', reps: 10 }] });
    expect(items[1]).toMatchObject({ badgeEmoji: undefined, badgeName: undefined });
    expect(items[2]).toMatchObject({ friendName: undefined });
  });

  it('a createdAt that only looks like a timestamp does not break the feed', async () => {
    const d = (id: string, createdAt: unknown) => ({ id, data: () => ({ userId: 'f1', exercises: [], createdAt }) });
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ docs: [d('ok', { toDate: () => new Date(2026, 9, 4) }), d('fake', { toDate: 1 })] } as never)
      .mockResolvedValueOnce({ docs: [] } as never);
    const items = await getFriendsActivity(['f1'], 2); // window full: its floor is computed
    expect(items.map((a) => a.sessionId)).toEqual(['ok']);
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

  it('a forgotten session older than the full window is left out (a silent gap hid the days in between)', async () => {
    const at = (day: number) => ({ toDate: () => new Date(2026, 9, day, 9) });
    const d = (id: string, data: Record<string, unknown>) => ({ id, data: () => ({ userId: 'f1', exercises: [], ...data }) });
    vi.mocked(getDocs)
      // limit 2 reached: sessions created before the 6th exist but were not read
      .mockResolvedValueOnce({ docs: [d('forgotten', { date: at(1), createdAt: at(7) }), d('sixth', { date: at(6), createdAt: at(6) })] } as never)
      .mockResolvedValueOnce({ docs: [] } as never);
    const items = await getFriendsActivity(['f1'], 2);
    expect(items.map((a) => a.sessionId)).toEqual(['sixth']);
  });

  it('one « new friend » card per friendship, whichever side accepted', async () => {
    const at = (min: number) => ({ toDate: () => new Date(2026, 9, 4, 8, min) });
    const ev = (id: string, userId: string, friendId: string, min: number) => ({ id, data: () => ({ type: 'new_friend', userId, friendId, createdAt: at(min) }) });
    const authors = [{ id: 'f1', data: () => ({ friends: ['f2'] }) }, { id: 'f2', data: () => ({ friends: ['f1'] }) }];
    vi.mocked(getDocs)
      .mockResolvedValueOnce({ docs: [] } as never)
      .mockResolvedValueOnce({ docs: [ev('readded', 'f2', 'f1', 3), ev('first', 'f1', 'f2', 1)] } as never)
      .mockResolvedValueOnce({ docs: authors, forEach: (fn: (d: unknown) => void) => authors.forEach(fn) } as never);
    const items = await getFriendsActivity(['f1', 'f2']);
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

describe('getLeaderboardStats', () => {
  it('leaves out sessions dated in the future (one dated 2100 counted in every period, and was re-read, for ever)', async () => {
    type Filter = { field?: string; op?: string; value?: { toDate: () => Date } };
    const stored = [
      { userId: 'f1', totalReps: 10, date: new Date() },
      { userId: 'f1', totalReps: 1e15, date: new Date(2100, 0, 1) },
    ];
    const kept = (date: Date, f: Filter) => (f.op === '>=' ? date >= f.value!.toDate() : f.op === '<=' ? date <= f.value!.toDate() : true);
    vi.mocked(getDocs).mockImplementationOnce((async (q: unknown) => { // filtered on date as Firestore would
      const filters = (q as Filter[]).filter((p) => p?.field === 'date');
      const docs = stored.filter((s) => filters.every((f) => kept(s.date, f))).map((s) => ({ data: () => s }));
      return { docs, forEach: (fn: (d: unknown) => void) => docs.forEach(fn) };
    }) as never);
    const [f1] = await getLeaderboardStats(['f1'], 'monthly');
    expect(f1).toMatchObject({ totalReps: 10, totalSessions: 1 });
  });
});
