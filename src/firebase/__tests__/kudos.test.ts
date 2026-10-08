import { describe, it, expect, vi } from 'vitest';
import { getDocs, limit, query, where, writeBatch } from 'firebase/firestore';
import { getUnreadKudos, markKudosSeen } from '../kudos';

const snap = (docs: { id: string; data?: Record<string, unknown> }[]) => ({ docs: docs.map((d) => ({ id: d.id, data: () => d.data ?? {} })) });
const kudosNotif = (id: string, fromUserId: string, sessionId?: string) =>
  ({ id, data: { userId: 'me', type: 'kudos', read: false, fromUserId, fromName: fromUserId, ...(sessionId ? { sessionId } : {}) } });

describe('getUnreadKudos', () => {
  it('drops withdrawn kudos and duplicates, and marks them read', async () => {
    const batch = { update: vi.fn(), commit: vi.fn(async () => {}) };
    vi.mocked(writeBatch).mockReturnValueOnce(batch as never);
    vi.mocked(getDocs)
      .mockResolvedValueOnce(snap([
        kudosNotif('n1', 'alice', 's1'),
        kudosNotif('n2', 'alice', 's1'), // tapped twice
        kudosNotif('n3', 'bob', 's1'),   // bob withdrew his 👏
        kudosNotif('n4', 'carol'),       // older notification without session: kept
      ]) as never)
      .mockResolvedValueOnce(snap([{ id: 'alice' }]) as never); // kudos still on s1
    const shown = await getUnreadKudos('me');
    expect(shown.map((n) => n.fromUserId)).toEqual(['alice', 'carol']);
    expect(batch.update).toHaveBeenCalledTimes(2); // n2, n3 no longer pending
  });

  it('reads only kudos, not the friend notifications nothing ever marks read', async () => {
    vi.mocked(where).mockImplementation(((field: string, op: string, value: unknown) => ({ field, op, value })) as never);
    vi.mocked(query).mockImplementation(((...parts: unknown[]) => parts) as never);
    const stored = [kudosNotif('k1', 'alice'),
      ...Array.from({ length: 15 }, (_, i) => ({ id: `a${i}`, data: { userId: 'me', type: 'friend_activity', read: false } }))];
    let read = 0;
    vi.mocked(getDocs).mockImplementationOnce((async (q: unknown) => { // the notifications collection, filtered as Firestore would
      const filters = (q as { field?: string; value?: unknown }[]).filter((p) => p?.field);
      const docs = stored.filter((d) => filters.every((f) => (d.data as Record<string, unknown>)[f.field!] === f.value));
      read += docs.length;
      return snap(docs);
    }) as never);
    const shown = await getUnreadKudos('me');
    expect(shown.map((n) => n.id)).toEqual(['k1']);
    expect(read).toBe(1);
  });

  it('reads at most 50 at a time (a friend could pile up thousands, all re-read on every Home visit)', async () => {
    vi.mocked(query).mockImplementationOnce(((...parts: unknown[]) => parts) as never);
    vi.mocked(limit).mockImplementationOnce(((n: number) => ({ limit: n })) as never);
    vi.mocked(getDocs).mockResolvedValueOnce(snap([]) as never);
    await getUnreadKudos('me');
    expect(vi.mocked(getDocs).mock.calls.at(-1)![0]).toContainEqual({ limit: 50 });
  });

  it('a session id that is not a usable id is marked read, never queried (it threw and the banner never cleared)', async () => {
    const batch = { update: vi.fn(), commit: vi.fn(async () => {}) };
    vi.mocked(writeBatch).mockReturnValueOnce(batch as never);
    vi.mocked(getDocs).mockClear().mockResolvedValueOnce(snap([
      { id: 'n1', data: { ...kudosNotif('n1', 'mallory').data, sessionId: { toString: 1 } } },
      kudosNotif('n2', 'mallory', 'a/b'),
    ]) as never);
    expect(await getUnreadKudos('me')).toEqual([]);
    expect(getDocs).toHaveBeenCalledTimes(1); // no kudos lookup
    expect(batch.update).toHaveBeenCalledTimes(2);
  });
});

describe('markKudosSeen', () => {
  it('commits in batches of at most 500 writes (one bigger batch failed, silently, every time)', async () => {
    const batches: { update: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> }[] = [];
    vi.mocked(writeBatch).mockImplementation((() => {
      const b = { update: vi.fn(), commit: vi.fn(async () => {}) };
      batches.push(b);
      return b;
    }) as never);
    await markKudosSeen(Array.from({ length: 1001 }, (_, i) => `n${i}`));
    expect(batches.map((b) => b.update.mock.calls.length)).toEqual([500, 500, 1]);
    expect(batches.every((b) => b.commit.mock.calls.length === 1)).toBe(true);
  });
});
