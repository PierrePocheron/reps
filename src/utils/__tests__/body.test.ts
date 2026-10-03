import { describe, it, expect } from 'vitest';
import { upsertBodyEntry, bodySeries, type BodyEntry } from '../body';

describe('mesures corporelles', () => {
  it('une entrée par date, complétée sans écraser les autres mesures, triée', () => {
    let e: BodyEntry[] = [{ date: '2026-10-01', weight: 70 }];
    e = upsertBodyEntry(e, { date: '2026-09-15', weight: 71, waist: 82 });
    e = upsertBodyEntry(e, { date: '2026-10-01', arm: 35, waist: 0 }); // 0 = champ laissé vide
    expect(e).toEqual([
      { date: '2026-09-15', weight: 71, waist: 82 },
      { date: '2026-10-01', weight: 70, arm: 35 },
    ]);
  });

  it('série d\'une mesure, en ignorant les dates sans valeur', () => {
    const s = bodySeries([{ date: '2026-09-15', weight: 71 }, { date: '2026-09-20', arm: 35 }, { date: '2026-10-01', weight: 70 }], 'weight');
    expect(s.map((p) => p.value)).toEqual([71, 70]);
    expect(s[0]!.date.getDate()).toBe(15);
  });
});
