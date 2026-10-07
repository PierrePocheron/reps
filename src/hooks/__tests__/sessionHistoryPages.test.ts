import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// A fake Firestore holding 120 renfo and 250 muscu sessions, newest first, that counts the documents it returns (billed reads)
type Stored = { id: string; date: number };
type Clause = { limit?: number; after?: { id: string } };
const STORE: Record<string, Stored[]> = {
  sessions: Array.from({ length: 120 }, (_, i) => ({ id: `r${i}`, date: 10_000 - i })),
  gym_sessions: Array.from({ length: 250 }, (_, i) => ({ id: `g${i}`, date: 10_000 - i })),
};
let reads = 0;

vi.mock('@/store/userStore', () => ({ useUserStore: () => ({ user: { uid: 'u1' } }) }));
vi.mock('@/firebase/config', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => {
  const read = async ({ root, clauses }: { root: string; clauses: Clause[] }) => {
    const all = STORE[root] ?? [];
    const after = clauses.find((c) => c.after)?.after;
    const from = after ? all.findIndex((d) => d.id === after.id) + 1 : 0;
    const n = clauses.find((c) => c.limit)?.limit ?? all.length;
    const docs = all.slice(from, from + n).map((d) => ({ id: d.id, data: () => ({ date: d.date }) }));
    reads += docs.length;
    return { docs, empty: docs.length === 0 };
  };
  return {
    collection: (_db: unknown, root: string) => root,
    query: (root: string, ...clauses: Clause[]) => ({ root, clauses }),
    orderBy: () => ({}),
    limit: (n: number) => ({ limit: n }),
    startAfter: (after: { id: string }) => ({ after }),
    getDocs: read,
    getDocsFromServer: read,
  };
});

import { useSessionHistory } from '../useSessionHistory';

const ids = (sessions: { sessionId: string }[]) => sessions.map((s) => s.sessionId);

describe('useSessionHistory « Voir les séances plus anciennes »', () => {
  it('a bigger count reads only the next sessions, of the collections that have more, and lists them as one read would', async () => {
    const { result, rerender } = renderHook(({ n }) => useSessionHistory(n), { initialProps: { n: 100 } });
    await waitFor(() => expect(result.current.gymSessions).toHaveLength(100));
    rerender({ n: 200 });
    await waitFor(() => expect(result.current.gymSessions).toHaveLength(200));
    rerender({ n: 300 });
    await waitFor(() => expect(result.current.gymSessions).toHaveLength(250));
    expect(ids(result.current.sessions)).toEqual(STORE.sessions!.map((d) => d.id));
    expect(ids(result.current.gymSessions)).toEqual(STORE.gym_sessions!.map((d) => d.id));
    expect(result.current.loading).toBe(false);
    expect(reads).toBe(120 + 250); // each session read once: re-reading from the top cost 890 here
  });
});
