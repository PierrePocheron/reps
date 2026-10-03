import { describe, it, expect } from 'vitest';
import { trainingStreaks, liveStreak } from '../streak';

const today = new Date(2026, 9, 3, 12);
const daysAgo = (n: number, hour = 18) => new Date(2026, 9, 3 - n, hour);

describe('trainingStreaks', () => {
  it('compte les jours distincts : deux séances le même jour ne cassent pas la série', () => {
    expect(trainingStreaks([daysAgo(0, 8), daysAgo(0, 19), daysAgo(1), daysAgo(2)], today))
      .toEqual({ current: 3, longest: 3 });
  });

  it('la série reste en cours si la dernière séance date d\'hier', () => {
    expect(trainingStreaks([daysAgo(1), daysAgo(2)], today).current).toBe(2);
  });

  it('le record ne dépend pas de la date de la dernière séance', () => {
    expect(trainingStreaks([daysAgo(10), daysAgo(11), daysAgo(12), daysAgo(13), daysAgo(20)], today))
      .toEqual({ current: 0, longest: 4 });
  });

  it('traverse le passage à l\'heure d\'hiver (25 octobre 2026)', () => {
    const dates = [new Date(2026, 9, 24, 18), new Date(2026, 9, 25, 18), new Date(2026, 9, 26, 18)];
    expect(trainingStreaks(dates, new Date(2026, 9, 26, 20))).toEqual({ current: 3, longest: 3 });
  });

  it('aucune séance', () => {
    expect(trainingStreaks([], today)).toEqual({ current: 0, longest: 0 });
  });
});

describe('liveStreak', () => {
  it('garde la série enregistrée si la dernière séance date d\'aujourd\'hui ou d\'hier, sinon 0', () => {
    expect(liveStreak(5, daysAgo(0), today)).toBe(5);
    expect(liveStreak(5, daysAgo(1), today)).toBe(5);
    expect(liveStreak(5, daysAgo(2), today)).toBe(0);
    expect(liveStreak(5, null, today)).toBe(0);
  });
});
