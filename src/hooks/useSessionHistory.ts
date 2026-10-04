import { useState, useEffect } from 'react';
import { getUserSessions } from '@/firebase/firestore';
import { getUserGymSessions } from '@/firebase/gymSessions';
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
