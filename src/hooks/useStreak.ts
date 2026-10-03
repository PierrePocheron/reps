import { useEffect, useRef } from 'react';
import { useUserStore } from '@/store/userStore';
import { updateUserStatsAfterSession } from '@/firebase/firestore';
import { logger } from '@/utils/logger';

/**
 * La série affichée = jours d'entraînement consécutifs, recalculée à chaque fin de séance.
 * Les comptes qui ne l'ont jamais eue (avant : série de connexions) sont recalculés une fois.
 */
export function useStreak() {
  const uid = useUserStore((s) => s.user?.uid);
  const needsRefresh = useUserStore((s) => !!s.user && s.user.lastTrainingDate === undefined);
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || !needsRefresh || done.current === uid) return;
    done.current = uid;
    updateUserStatsAfterSession(uid, 0).catch((err) => logger.error('Recalcul de la série :', err));
  }, [uid, needsRefresh]);
}
