import { describe, it, expect } from 'vitest';
import { trainingStreaks, liveStreak, weeklyStreaks, liveWeeklyStreak } from '../streak';

// Samedi 3 octobre 2026, midi
const today = new Date(2026, 9, 3, 12);
const daysAgo = (n: number, hour = 18) => new Date(2026, 9, 3 - n, hour);
const key = (n: number) => new Date(2026, 9, 3 - n).getTime();

describe('trainingStreaks', () => {
  it('compte les jours distincts : deux séances le même jour ne cassent pas la série', () => {
    expect(trainingStreaks([daysAgo(0, 8), daysAgo(0, 19), daysAgo(1), daysAgo(2)], today))
      .toMatchObject({ current: 3, longest: 3 });
  });

  it('la série reste en cours si la dernière séance date d\'hier', () => {
    expect(trainingStreaks([daysAgo(1), daysAgo(2)], today).current).toBe(2);
  });

  it('joker : un jour de repos isolé est couvert et compte une fois comblé', () => {
    // lun 28, mar 29, (mer 30 repos), jeu 1, ven 2
    const r = trainingStreaks([daysAgo(5), daysAgo(4), daysAgo(2), daysAgo(1)], today);
    expect(r).toMatchObject({ current: 5, longest: 5, pendingJoker: null, lastJokerDay: key(3) });
  });

  it('joker en attente : hier manqué, la série tient sans compter le jour de repos', () => {
    const r = trainingStreaks([daysAgo(3), daysAgo(2)], today);
    expect(r).toMatchObject({ current: 2, pendingJoker: key(1) });
  });

  it('un seul joker par semaine, et pas pour deux jours de suite', () => {
    // lun 28 ✓, mar 29 ✗ (joker), mer 30 ✓, jeu 1 ✗ (même semaine : casse), ven 2 ✓
    expect(trainingStreaks([daysAgo(5), daysAgo(3), daysAgo(1)], today)).toMatchObject({ current: 1, longest: 3 });
    expect(trainingStreaks([daysAgo(5), daysAgo(2)], today)).toMatchObject({ current: 1, longest: 1 });
  });

  it('le record ne dépend pas de la date de la dernière séance', () => {
    expect(trainingStreaks([daysAgo(10), daysAgo(11), daysAgo(12), daysAgo(13), daysAgo(20)], today))
      .toMatchObject({ current: 0, longest: 4 });
  });

  it('traverse le passage à l\'heure d\'hiver (25 octobre 2026)', () => {
    const dates = [new Date(2026, 9, 24, 18), new Date(2026, 9, 25, 18), new Date(2026, 9, 26, 18)];
    expect(trainingStreaks(dates, new Date(2026, 9, 26, 20))).toMatchObject({ current: 3, longest: 3 });
  });

  it('aucune séance', () => {
    expect(trainingStreaks([], today)).toEqual({ current: 0, longest: 0, pendingJoker: null, lastJokerDay: null });
  });
});

describe('liveStreak', () => {
  it('garde la série enregistrée si la dernière séance date d\'aujourd\'hui ou d\'hier', () => {
    expect(liveStreak(5, daysAgo(0), null, today)).toBe(5);
    expect(liveStreak(5, daysAgo(1), null, today)).toBe(5);
    expect(liveStreak(5, null, null, today)).toBe(0);
  });

  it('un jour manqué : joker si pas encore utilisé cette semaine, sinon 0', () => {
    expect(liveStreak(5, daysAgo(2), null, today)).toBe(5);
    expect(liveStreak(5, daysAgo(2), key(4), today)).toBe(0); // joker déjà pris mardi
    expect(liveStreak(5, daysAgo(2), key(10), today)).toBe(5); // joker d'une autre semaine
    expect(liveStreak(5, daysAgo(3), null, today)).toBe(0);
  });

  it("le joker en attente (hier) ne compte pas comme un joker déjà pris : valeurs recalculées au lancement", () => {
    const s = trainingStreaks([daysAgo(4), daysAgo(3), daysAgo(2)], today); // repos hier, pas encore entraîné aujourd'hui
    expect(s).toMatchObject({ current: 3, pendingJoker: key(1), lastJokerDay: key(1) });
    expect(liveStreak(s.current, daysAgo(2), s.lastJokerDay, today)).toBe(3); // widget et en-tête affichaient 0
  });
});

describe('weeklyStreaks', () => {
  // semaines : 14 sept, 21 sept, 28 sept, 5 oct… (aujourd'hui = samedi 3 octobre, semaine du 28 sept)
  const at = (y: number, m: number, d: number) => new Date(y, m, d, 18);
  it('semaines consécutives avec l\'objectif atteint, semaine en cours comptée si atteinte', () => {
    const dates = [at(2026, 8, 14), at(2026, 8, 16), at(2026, 8, 22), at(2026, 8, 24), at(2026, 8, 29), at(2026, 9, 1)];
    expect(weeklyStreaks(dates, 2, today)).toMatchObject({ current: 3, longest: 3 });
  });

  it('semaine en cours pas encore atteinte : la série tient grâce à la semaine précédente', () => {
    const dates = [at(2026, 8, 22), at(2026, 8, 24), at(2026, 8, 29)];
    expect(weeklyStreaks(dates, 2, today)).toMatchObject({ current: 1, longest: 1 });
  });

  it('une semaine sous l\'objectif casse la série', () => {
    const dates = [at(2026, 8, 7), at(2026, 8, 8), at(2026, 8, 15), at(2026, 8, 29), at(2026, 9, 1)];
    expect(weeklyStreaks(dates, 2, today)).toMatchObject({ current: 1, longest: 1 });
  });

  it('liveWeeklyStreak : 0 si la dernière semaine réussie date d\'il y a plus d\'une semaine', () => {
    const r = weeklyStreaks([at(2026, 8, 14), at(2026, 8, 15)], 2, new Date(2026, 8, 20));
    expect(liveWeeklyStreak(r.current, r.lastMetWeek, new Date(2026, 8, 25))).toBe(1);
    expect(liveWeeklyStreak(r.current, r.lastMetWeek, today)).toBe(0);
  });
});
