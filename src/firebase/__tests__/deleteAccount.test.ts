import { describe, it, expect, vi, beforeEach } from 'vitest';

// Path-aware Firestore fake: each query answers with the documents stored under its path
const deleted: string[] = [];
const updated: { path: string; data: unknown }[] = [];
const data: Record<string, string[]> = {};
vi.mock('firebase/firestore', () => {
  const ref = (path: string) => ({ path });
  return {
    collection: (_db: unknown, ...segments: string[]) => ref(segments.join('/')),
    collectionGroup: (_db: unknown, id: string) => ({ group: id }),
    doc: (_db: unknown, ...segments: string[]) => ref(segments.join('/')),
    query: (base: { path?: string; group?: string }, ...clauses: string[]) => ({ ...base, clauses }),
    where: (field: string, _op: string, value: string) => `${field}=${value}`,
    getDocs: async (q: { path?: string; group?: string; clauses?: string[] }) => {
      const key = q.group ? `group:${q.group}:${q.clauses?.join('&')}` : `${q.path}${q.clauses?.length ? `?${q.clauses.join('&')}` : ''}`;
      const docs = (data[key] ?? []).map((p) => ({ id: p.split('/').pop(), ref: ref(p) }));
      return { docs, forEach: (fn: (d: { id?: string; ref: { path: string } }) => void) => docs.forEach(fn) };
    },
    writeBatch: () => ({ delete: (r: { path: string }) => deleted.push(r.path), commit: async () => {} }),
    getDoc: async (r: { path: string }) => ({ exists: () => r.path === 'users/u1', data: () => ({ friends: ['f1', 'f2'] }) }),
    updateDoc: async (r: { path: string }, d: unknown) => { updated.push({ path: r.path, data: d }); },
    arrayRemove: (v: string) => ({ arrayRemove: v }),
    terminate: vi.fn(async () => {}),
    clearIndexedDbPersistence: vi.fn(async () => {}),
  };
});
vi.mock('firebase/auth', () => ({
  deleteUser: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  reauthenticateWithPopup: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
  GoogleAuthProvider: class {},
}));
vi.mock('../config', () => ({
  db: {},
  auth: { currentUser: { uid: 'u1', email: 'u1@reps.test', providerData: [{ providerId: 'password' }] } },
}));

import { deleteUserAccount } from '../deleteAccount';

describe('deleteUserAccount', () => {
  beforeEach(() => {
    deleted.length = 0;
    updated.length = 0;
    for (const k of Object.keys(data)) delete data[k];
    data['sessions/u1/userSessions'] = ['sessions/u1/userSessions/s1'];
    data['sessions/u1/userSessions/s1/kudos'] = ['sessions/u1/userSessions/s1/kudos/friendA'];
    data['group:kudos:fromUid=u1'] = ['sessions/friendB/userSessions/x9/kudos/u1'];
    data['users/u1/private'] = ['users/u1/private/body'];
  });

  it('removes the kudos received on own sessions and those given on friends\' sessions', async () => {
    await deleteUserAccount('u1', 'pw');
    expect(deleted).toContain('sessions/u1/userSessions/s1/kudos/friendA'); // subcollections survive a parent delete
    expect(deleted).toContain('sessions/friendB/userSessions/x9/kudos/u1');
  });

  it('still removes the account data itself', async () => {
    await deleteUserAccount('u1', 'pw');
    expect(deleted).toEqual(expect.arrayContaining(['sessions/u1/userSessions/s1', 'users/u1/private/body', 'users/u1']));
  });

  it('takes itself out of its friends\' lists (no ghost friend left behind)', async () => {
    await deleteUserAccount('u1', 'pw');
    expect(updated).toEqual([
      { path: 'users/f1', data: { friends: { arrayRemove: 'u1' } } },
      { path: 'users/f2', data: { friends: { arrayRemove: 'u1' } } },
    ]);
  });
});
