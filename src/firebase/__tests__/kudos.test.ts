import { describe, it, expect, vi } from 'vitest';
import { getDocs, query, where, writeBatch } from 'firebase/firestore';
import { getUnreadKudos } from '../kudos';

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
});
