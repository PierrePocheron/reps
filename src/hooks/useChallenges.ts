import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';
import { UserChallenge, getUserActiveChallenges } from '@/firebase/challenges';
import { logger } from '@/utils/logger';

export function useChallenges() {
  // uid only: every users/{uid} snapshot stores a new user object, which reloaded the list with the spinner
  const uid = useUserStore((s) => s.user?.uid);
  const [activeChallenges, setActiveChallenges] = useState<UserChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChallenges = useCallback(async (isInitialLoad = false) => {
    if (!uid) {
        if (isInitialLoad) setIsLoading(false);
        return;
    }

    try {
      if (isInitialLoad) setIsLoading(true);
      const challenges = await getUserActiveChallenges(uid);
      setActiveChallenges(challenges);
    } catch (error) {
      logger.error("Error fetching challenges:", error);
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    fetchChallenges(true);
    // Cards derive "today" at render: reload on return to the app, the day may have changed overnight
    const onVisible = () => { if (document.visibilityState === 'visible') fetchChallenges(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchChallenges]);

  const refreshChallenges = () => fetchChallenges(false);

  return {
    activeChallenges,
    isLoading,
    refreshChallenges
  };
}
