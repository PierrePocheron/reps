import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { UserChallenge, getUserActiveChallenges } from '@/firebase/challenges';

export function useChallenges() {
  const { user } = useUserStore();
  const [activeChallenges, setActiveChallenges] = useState<UserChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    const fetchChallenges = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching challenges for user:", user.uid);
        const challenges = await getUserActiveChallenges(user.uid);
        console.log("Fetched challenges:", challenges);
        setActiveChallenges(challenges);
      } catch (error) {
        console.error("Error fetching challenges:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChallenges();
  }, [user, refreshTrigger]);

  const refreshChallenges = () => setRefreshTrigger(prev => prev + 1);

  return {
    activeChallenges,
    isLoading,
    refreshChallenges
  };
}
