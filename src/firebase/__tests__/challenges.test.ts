import { describe, it, expect } from 'vitest';
import {
    getCustomChallengeParams,
    getTargetForDay,
    calculateChallengeTotalReps,
    getDayIndex
} from '../challenges';
// Removed unused Timestamp import

describe('Challenge Logic', () => {
    describe('getCustomChallengeParams', () => {
        it('should return fixed params', () => {
            const result = getCustomChallengeParams('easy', 'pushups', 'fixed');
            expect(result.inc).toBe(0);
            expect(result.base).toBeGreaterThan(0);
        });

        it('should return progressive params', () => {
            const result = getCustomChallengeParams('easy', 'pushups', 'progressive');
            expect(result.inc).toBeGreaterThan(0);
        });

        it('should adjust for harder exercises (pullups)', () => {
             const pushups = getCustomChallengeParams('medium', 'pushups', 'progressive');
             const pullups = getCustomChallengeParams('medium', 'pullups', 'progressive');
             expect(pullups.base).toBeLessThan(pushups.base);
        });
    });

    describe('getTargetForDay', () => {
        it('should always return base for fixed logic', () => {
            const def = { logic: 'fixed', baseAmount: 20, increment: 5 } as any;
            expect(getTargetForDay(def, 0)).toBe(20);
            expect(getTargetForDay(def, 10)).toBe(20);
        });

        it('should increment for progressive logic', () => {
             const def = { logic: 'progressive', baseAmount: 10, increment: 2 } as any;
             expect(getTargetForDay(def, 0)).toBe(10);
             expect(getTargetForDay(def, 1)).toBe(12);
             expect(getTargetForDay(def, 5)).toBe(20);
        });
    });

    describe('calculateChallengeTotalReps', () => {
         it('should calculate simple multiplication for fixed', () => {
             const def = { logic: 'fixed', baseAmount: 10, durationDays: 30 } as any;
             expect(calculateChallengeTotalReps(def)).toBe(300);
         });

         it('should calculate arithmetic series for progressive', () => {
             const def = { logic: 'progressive', baseAmount: 10, increment: 2, durationDays: 5 } as any;
             expect(calculateChallengeTotalReps(def)).toBe(70);
         });
    });

    describe('getDayIndex', () => {
        it('should return 0 for same day', () => {
            const now = new Date();
            const start = { toDate: () => now } as any;
            expect(getDayIndex(start, now)).toBe(0);
        });

        it('should return correct diff', () => {
             const start = new Date('2024-01-01');
             const target = new Date('2024-01-05');
             const startTs = { toDate: () => start } as any;

             expect(getDayIndex(startTs, target)).toBe(4);
        });

        it('should return 0 if target is before start', () => {
             const start = new Date('2024-01-05');
             const target = new Date('2024-01-01');
             const startTs = { toDate: () => start } as any;
             expect(getDayIndex(startTs, target)).toBe(0);
        });
    });
});
