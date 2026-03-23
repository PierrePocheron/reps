import { useState, useEffect } from 'react';
import { getUserSessions } from '@/firebase/firestore';
import { getUserGymSessions } from '@/firebase/gymSessions';
import { useUserStore } from '@/store/userStore';
import type { Session, GymSession } from '@/firebase/types';

export interface SessionHistory {
  sessions: Session[];
  gymSessions: GymSession[];
  loading: boolean;
}

export function useSessionHistory(limitCount = 200): SessionHistory {
  const { user } = useUserStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [gymSessions, setGymSessions] = useState<GymSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getUserSessions(user.uid, limitCount),
      getUserGymSessions(user.uid, limitCount),
    ])
      .then(([s, g]) => {
        setSessions(s);
        setGymSessions(g);
      })
      .finally(() => setLoading(false));
  }, [user?.uid, limitCount]);

  return { sessions, gymSessions, loading };
}
