import { describe, it, expect } from 'vitest';
import { getUnlockedBadges, getNextBadge, BADGES } from '../constants';
import type { UserStats } from '@/firebase/types';
import { Timestamp } from 'firebase/firestore';

const mockStats: UserStats = {
  totalReps: 0,
  totalSessions: 0,
  totalCalories: 0,
  averageRepsPerSession: 0,
  averageDuration: 0,
  averageExercises: 0,
  currentStreak: 0,
  longestStreak: 0,
  morningSessions: 0,
  lunchSessions: 0,
  nightSessions: 0,
  exercisesDistribution: [],
  // Optional but good for completeness type-wise
  lastSessionDate: Timestamp.now(),
  lastSessionReps: 0
};

describe('Gamification Constants Logic', () => {
  describe('getUnlockedBadges', () => {
    it('should return no badges for empty stats', () => {
      const badges = getUnlockedBadges(mockStats);
      // "Poussin" is threshold 0, so it should be unlocked strictly speaking if logic is >= 0
      // Let's check the Poussin badge definition. Threshold 0.
      expect(badges).toContainEqual(expect.objectContaining({ id: 'poussin' }));
      // Should not contain others
      expect(badges.length).toBe(1);
    });

    it('should unlock total_reps badges', () => {
      const stats = { ...mockStats, totalReps: 1500 };
      const badges = getUnlockedBadges(stats);

      const mosquito = BADGES.find(b => b.id === 'mosquito'); // 1000 reps
      const tiger = BADGES.find(b => b.id === 'tiger'); // 2000 reps

      expect(badges).toContainEqual(mosquito);
      expect(badges).not.toContainEqual(tiger);
    });

    it('should unlock streak badges', () => {
        const stats = { ...mockStats, currentStreak: 5 };
        const badges = getUnlockedBadges(stats);

        const streak3 = BADGES.find(b => b.id === 'streak-3');
        const streak7 = BADGES.find(b => b.id === 'streak-7');

        expect(badges).toContainEqual(streak3);
        expect(badges).not.toContainEqual(streak7);
      });
  });

  describe('getNextBadge', () => {
    it('should return the next closest badge based on percentage', () => {
      // Setup: 900 reps (90% to 1000) vs 0 streaks
      const stats = { ...mockStats, totalReps: 900, currentStreak: 0 };

      const next = getNextBadge(stats);
      expect(next?.id).toBe('mosquito'); // 1000 reps is closest
    });

    it('should prioritize the higher completion percentage across categories', () => {
     // Setup:
     // Mosquito (1000 reps) -> 100 reps done = 10%
     // Streak-3 (3 days) -> 2 days done = 66%
     const stats = { ...mockStats, totalReps: 100, currentStreak: 2 };

     const next = getNextBadge(stats);
     expect(next?.id).toBe('streak-3');
    });

    it('should return undefined if all badges are unlocked', () => {
        // Mock a god-like user
        const stats = {
            ...mockStats,
            totalReps: 100000,
            currentStreak: 1000,
            totalSessions: 1000,
            morningSessions: 1000,
            lunchSessions: 1000,
            nightSessions: 1000,
            totalCalories: 100000
        };
        const next = getNextBadge(stats);
        expect(next).toBeUndefined();
    });
  });
});
