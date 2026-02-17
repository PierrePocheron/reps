import { useState, useEffect, useCallback } from 'react';
import { useUserStore } from '@/store/userStore';
import { UserChallenge, getUserActiveChallenges } from '@/firebase/challenges';
import { logger } from '@/utils/logger';

export function useChallenges() {
  const { user } = useUserStore();
  const [activeChallenges, setActiveChallenges] = useState<UserChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChallenges = useCallback(async (isInitialLoad = false) => {
    if (!user) {
        if (isInitialLoad) setIsLoading(false);
        return;
    }

    try {
      if (isInitialLoad) setIsLoading(true);
      const challenges = await getUserActiveChallenges(user.uid);
      setActiveChallenges(challenges);
    } catch (error) {
      logger.error("Error fetching challenges:", error);
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChallenges(true);
  }, [fetchChallenges]);

  const refreshChallenges = () => fetchChallenges(false);

  return {
    activeChallenges,
    isLoading,
    refreshChallenges
  };
}
