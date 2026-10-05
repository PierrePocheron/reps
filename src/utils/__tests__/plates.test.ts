import { describe, it, expect } from 'vitest';
import { platesPerSide, warmupSets, DEFAULT_PLATES } from '../plates';

describe('platesPerSide', () => {
  it('100 kg sur barre de 20 : 25 + 15 par côté', () => {
    expect(platesPerSide(100, 20, DEFAULT_PLATES)).toEqual({ plates: [25, 15], total: 100 });
  });

  it('jeu de disques personnalisé : pas de piège glouton', () => {
    expect(platesPerSide(70, 20, [20, 15, 10])).toEqual({ plates: [15, 10], total: 70 });
  });

  it('charge impossible : arrondie au plus proche réalisable', () => {
    expect(platesPerSide(61, 20, DEFAULT_PLATES).total).toBe(60);
    expect(platesPerSide(63, 20, [10, 5]).total).toBe(60);
  });

  it('charge ≤ barre : barre seule', () => {
    expect(platesPerSide(15, 20, DEFAULT_PLATES)).toEqual({ plates: [], total: 20 });
  });
});

describe('platesPerSide : charge aberrante', () => {
  it('reste instantané sur une faute de frappe (10 000 000 kg gelait la séance)', () => {
    const t0 = performance.now();
    const r = platesPerSide(1e7, 20, DEFAULT_PLATES);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(r.total).toBeLessThan(1100); // au plus proche du maximum géré, affiché tel quel par le calculateur
    expect(() => platesPerSide(Number('1e400'), 20, DEFAULT_PLATES)).not.toThrow(); // Infinity
  });
});

describe('warmupSets', () => {
  it('barre de 20 kg, 100 kg de travail : 40 / 60 / 80 kg arrondis aux disques', () => {
    expect(warmupSets(100, { bar: 20, plates: DEFAULT_PLATES })).toEqual([
      { weight: 40, reps: 8 }, { weight: 60, reps: 5 }, { weight: 80, reps: 3 },
    ]);
  });

  it('charge légère : pas de doublon ni de série sous la barre', () => {
    expect(warmupSets(30, { bar: 20, plates: DEFAULT_PLATES })).toEqual([{ weight: 20, reps: 8 }, { weight: 25, reps: 3 }]);
  });

  it('hors barre : arrondi à 2,5 kg', () => {
    expect(warmupSets(24, null)).toEqual([{ weight: 10, reps: 8 }, { weight: 15, reps: 5 }, { weight: 20, reps: 3 }]);
  });
});
