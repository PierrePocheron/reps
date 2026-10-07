import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, limit, orderBy, query, startAfter, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getUserSessions, getUserSessionsBetween } from '@/firebase/firestore';
import { getUserGymSessions, getUserGymSessionsBetween } from '@/firebase/gymSessions';
import { useUserStore } from '@/store/userStore';
import { logger } from '@/utils/logger';
import type { Session, GymSession } from '@/firebase/types';

export interface SessionHistory {
  sessions: Session[];
  gymSessions: GymSession[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

/** The whole history, for the rare reads that must not stop at a page: export and import duplicate check. */
export async function fetchWholeHistory(uid: string): Promise<{ sessions: Session[]; gymSessions: GymSession[] }> {
  const ALL = 100_000; // Settings used the latest 500: older sessions were missing from « toutes tes données »
  // from the server: offline, the cache holds only what this device has read, and the export said « complete »
  const [sessions, gymSessions] = await Promise.all([getUserSessions(uid, ALL, true), getUserGymSessions(uid, ALL, true)]);
  return { sessions, gymSessions };
}

type Cursor = QueryDocumentSnapshot | undefined;
const RENFO = ['sessions', 'userSessions'] as const;
const GYM = ['gym_sessions', 'userGymSessions'] as const;

/** n sessions of one collection, newest first, after the `after` document (a cursor: only these n are read). */
async function readPage<T>([root, sub]: readonly [string, string], uid: string, n: number, after: Cursor): Promise<{ items: T[]; last: Cursor }> {
  const { docs } = await getDocs(query(collection(db, root, uid, sub), orderBy('date', 'desc'), ...(after ? [startAfter(after)] : []), limit(n)));
  return { items: docs.map((d) => ({ sessionId: d.id, ...d.data() })) as T[], last: docs[docs.length - 1] ?? after };
}

interface Loaded { uid: string; tick: number; n: number; sessions: Session[]; gymSessions: GymSession[]; lastRenfo: Cursor; lastGym: Cursor }

export function useSessionHistory(limitCount = 200): SessionHistory {
  const uid = useUserStore().user?.uid;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [gymSessions, setGymSessions] = useState<GymSession[]>([]);
  const done = useRef<Loaded | null>(null); // the last list read, for the next page's cursors
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    // A bigger count (« Voir les séances plus anciennes ») reads only the next sessions, after the last one loaded, of each
    // collection that filled its page: re-reading from the top billed every page again. Anything else reads from the top.
    const prev = done.current;
    const older = prev && prev.uid === uid && prev.tick === tick && limitCount > prev.n ? prev : null;
    const n = limitCount - (older?.n ?? 0);
    let alive = true;
    setLoading(true);
    setError(false);
    Promise.all([
      older && older.sessions.length < older.n ? { items: [], last: older.lastRenfo } : readPage<Session>(RENFO, uid, n, older?.lastRenfo),
      older && older.gymSessions.length < older.n ? { items: [], last: older.lastGym } : readPage<GymSession>(GYM, uid, n, older?.lastGym),
    ])
      .then(([r, g]) => {
        if (!alive) return;
        done.current = {
          uid, tick, n: limitCount, lastRenfo: r.last, lastGym: g.last,
          sessions: [...(older?.sessions ?? []), ...r.items], gymSessions: [...(older?.gymSessions ?? []), ...g.items],
        };
        setSessions(done.current.sessions);
        setGymSessions(done.current.gymSessions);
      })
      .catch((err) => {
        logger.error('Historique des séances :', err);
        if (alive) setError(true);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uid, limitCount, tick]);

  return { sessions, gymSessions, loading, error, refetch: () => setTick((t) => t + 1) };
}

/** Sessions of one period (month / year recap), read by date range rather than from the latest page. enabled: false
 * when the caller already holds the whole range (nothing read, loaded stays false). */
export function usePeriodHistory(from: Date, to: Date, enabled = true): { sessions: Session[]; gymSessions: GymSession[]; loaded: boolean } {
  const uid = useUserStore().user?.uid;
  const [state, setState] = useState<{ key: string; sessions: Session[]; gymSessions: GymSession[] } | null>(null);
  const key = `${uid}:${from.getTime()}:${to.getTime()}`;

  useEffect(() => {
    if (!uid || !enabled) return;
    let alive = true;
    Promise.all([getUserSessionsBetween(uid, from, to), getUserGymSessionsBetween(uid, from, to)])
      .then(([sessions, gymSessions]) => { if (alive) setState({ key, sessions, gymSessions }); })
      .catch(() => { /* the recap falls back to the sessions already loaded */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key covers uid, from and to
  }, [key, enabled]);

  const loaded = state?.key === key;
  return { sessions: loaded ? state.sessions : [], gymSessions: loaded ? state.gymSessions : [], loaded };
}
