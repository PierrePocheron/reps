import { describe, it, expect } from 'vitest';
import { calculateDynamicCalories } from '../calories';
import type { User, Exercise } from '@/firebase/types';

describe('Calories Calculation Logic', () => {
  const mockExercise: Exercise = {
    id: 'pushups',
    name: 'Pompes',
    emoji: '💪',
    met: 4.5, // Moderate effort
    timePerRep: 2.5, // Seconds
  };

  const baseUser: User = {
    uid: '123',
    email: 'test@test.com',
    displayName: 'Tester',
    totalReps: 0,
    totalSessions: 0,
    badges: [],
    friends: [],
    currentStreak: 0,
    longestStreak: 0,
    createdAt: {} as any,
    updatedAt: {} as any,
    lastConnection: null,
    // Defaults for test
    weight: 75,
    height: 175,
    gender: 'male'
  };

  it('should return 0 if user is null', () => {
    expect(calculateDynamicCalories(null, mockExercise, 10)).toBe(0);
  });

  it('should calculate base male calories correctly', () => {
    // Math Check:
    // Weight: 75kg, MET: 4.5
    // KcalPerMin = (4.5 * 3.5 * 75) / 200 = 5.90625
    // TimePerRep: 2.5s -> (2.5/60) = 0.04166 min
    // BaseCostPerRep = 5.90625 * 0.04166 = 0.24609
    // HeightFactor: 175/175 = 1
    // GenderFactor: 1 (male)
    // Reps: 10
    // Total = 0.24609 * 10 = 2.46

    const result = calculateDynamicCalories(baseUser, mockExercise, 10);
    expect(result).toBe(2.46);
  });

  it('should adjust for female gender (~10% less)', () => {
    const femaleUser = { ...baseUser, gender: 'female' as const };
    // Same math as above but * 0.9
    // 2.46 * 0.9 = 2.214 -> 2.21
    const result = calculateDynamicCalories(femaleUser, mockExercise, 10);
    expect(result).toBe(2.21);
  });

  it('should adjust for height (taller = more work)', () => {
      const tallUser = { ...baseUser, height: 200 }; // 200cm
      // HeightFactor = 200/175 = 1.1428
      // Base (2.46 for 10 reps) * 1.1428 = 2.81
      const result = calculateDynamicCalories(tallUser, mockExercise, 10);
      expect(result).toBe(2.81);
  });

  it('should adjust for weight (heavier = more energy)', () => {
    const heavyUser = { ...baseUser, weight: 100 }; // 100kg
    // KcalPerMin = (4.5 * 3.5 * 100) / 200 = 7.875
    // CostPerRep = 7.875 * (2.5/60) = 0.328125
    // Total 10 reps = 3.28
    const result = calculateDynamicCalories(heavyUser, mockExercise, 10);
    expect(result).toBe(3.28);
  });

  it('should handle custom exercises with defaults (missing MET/Time)', () => {
    const customExercise: Exercise = {
        id: 'burpees',
        name: 'Burpees',
        emoji: '😰'
        // Missing met/timePerRep
    };

    // Default MET = 4.0, Default Time = 2.0s
    // Weight 75
    // KcalPerMin = (4.0 * 3.5 * 75) / 200 = 5.25
    // CostPerRep = 5.25 * (2.0/60) = 0.175
    // 10 reps = 1.75
    const result = calculateDynamicCalories(baseUser, customExercise, 10);
    expect(result).toBe(1.75);
  });
});
