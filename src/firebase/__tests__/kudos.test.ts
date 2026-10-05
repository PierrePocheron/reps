import { describe, it, expect, vi } from 'vitest';
import { getDocs, writeBatch } from 'firebase/firestore';
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
});
