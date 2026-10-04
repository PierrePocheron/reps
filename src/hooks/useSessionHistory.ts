import { useState, useEffect } from 'react';
import { getUserSessions, getUserSessionsBetween } from '@/firebase/firestore';
import { getUserGymSessions, getUserGymSessionsBetween } from '@/firebase/gymSessions';
import { useUserStore } from '@/store/userStore';
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
  const [sessions, gymSessions] = await Promise.all([getUserSessions(uid, ALL), getUserGymSessions(uid, ALL)]);
  return { sessions, gymSessions };
}

export function useSessionHistory(limitCount = 200): SessionHistory {
  const uid = useUserStore().user?.uid;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [gymSessions, setGymSessions] = useState<GymSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(false);
    Promise.all([
      getUserSessions(uid, limitCount),
      getUserGymSessions(uid, limitCount),
    ])
      .then(([s, g]) => {
        setSessions(s);
        setGymSessions(g);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [uid, limitCount, tick]);

  return { sessions, gymSessions, loading, error, refetch: () => setTick((t) => t + 1) };
}

/** Sessions of one period (month / year recap), read by date range rather than from the latest page. */
export function usePeriodHistory(from: Date, to: Date): { sessions: Session[]; gymSessions: GymSession[]; loaded: boolean } {
  const uid = useUserStore().user?.uid;
  const [state, setState] = useState<{ key: string; sessions: Session[]; gymSessions: GymSession[] } | null>(null);
  const key = `${uid}:${from.getTime()}:${to.getTime()}`;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    Promise.all([getUserSessionsBetween(uid, from, to), getUserGymSessionsBetween(uid, from, to)])
      .then(([sessions, gymSessions]) => { if (alive) setState({ key, sessions, gymSessions }); })
      .catch(() => { /* the recap falls back to the sessions already loaded */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key covers uid, from and to
  }, [key]);

  const loaded = state?.key === key;
  return { sessions: loaded ? state.sessions : [], gymSessions: loaded ? state.gymSessions : [], loaded };
}
