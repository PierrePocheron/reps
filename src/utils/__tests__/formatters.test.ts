import { describe, it, expect, vi } from 'vitest';
import {
  frDate,
  formatDate,
  formatDateShort,
  formatDuration,
  formatDurationLong,
  formatNumber,
  formatReps,
  formatRelativeDate,
  plural,
  ageFrom,
  isRealDay,
  parseDecimal,
  decimalInput,
  shortDate,
} from '../formatters';

describe('Formatters Utils', () => {
  describe('formatDate', () => {
    it('should format date correctly in French', () => {
      const date = new Date('2023-12-25');
      // Node environment/CI locale might vary, but 'fr-FR' is forced in the function.
      // Output: "25 décembre 2023"
      // Note: non-breaking spaces might be present.
      expect(formatDate(date)).toMatch(/25 d(é|e)cembre 2023/);
    });

    it('should handle string input', () => {
      expect(formatDate('2024-01-01')).toMatch(/1(\s|er)? janv(ier|\.)? 2024/);
    });
  });

  describe('formatDateShort', () => {
    it('should format date as DD/MM/YYYY', () => {
      const date = new Date('2023-12-25');
      expect(formatDateShort(date)).toBe('25/12/2023');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(600)).toBe('10:00');
      expect(formatDuration(9)).toBe('00:09');
    });
  });

  describe('formatDurationLong', () => {
    // French style with no-break spaces: « 45 s », « 47 min », « 1 h 07 » (« 1h 0min », « 47min 04s » before)
    it('should format seconds only', () => {
      expect(formatDurationLong(45)).toBe('45\u00a0s');
    });
    it('should format minutes, seconds dropped', () => {
      expect(formatDurationLong(125)).toBe('2\u00a0min');
      expect(formatDurationLong(2824)).toBe('47\u00a0min');
    });
    it('should format hours and two-digit minutes', () => {
      expect(formatDurationLong(3665)).toBe('1\u00a0h\u00a001');
      expect(formatDurationLong(3600)).toBe('1\u00a0h\u00a000');
      expect(formatDurationLong(4020)).toBe('1\u00a0h\u00a007');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with French locale', () => {
      // In French, thousands separator is space (often non-breaking)
      const formatted = formatNumber(1000);
      expect(formatted).toMatch(/1\s000/);
    });
  });

  describe('formatReps', () => {
    it('should properly pluralize reps', () => {
      expect(formatReps(1)).toContain('rep');
      expect(formatReps(1)).not.toContain('reps');

      expect(formatReps(5)).toContain('reps');
    });
  });

  describe('formatRelativeDate', () => {
      it('should return "À l\'instant" for < 60s', () => {
          const now = new Date();
          expect(formatRelativeDate(now)).toBe("À l'instant");
      });

      it('should return relative minutes', () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - 5);
        expect(formatRelativeDate(d)).toBe('Il y a 5 minutes');
      });

      it('should return relative hours', () => {
        const d = new Date();
        d.setHours(d.getHours() - 2);
        expect(formatRelativeDate(d)).toBe('Il y a 2 heures');
      });

      it('should return relative days', () => {
        const d = new Date();
        d.setDate(d.getDate() - 3);
        expect(formatRelativeDate(d)).toBe('Il y a 3 jours');
      });

      it('should fallback to short date for > 7 days', () => {
        const d = new Date('2020-01-01');
        expect(formatRelativeDate(d)).toBe('01/01/2020');
      });
  });
});

describe('plural', () => {
  it('pluriel à partir de 2, comme en français', () => {
    expect(plural(1, 'série')).toBe('1 série');
    expect(plural(1.5, 'série')).toBe('1,5 série');
    expect(plural(2, 'série')).toBe('2 séries');
    expect(plural(0, 'jour')).toBe('0 jour');
  });
});

describe('frDate', () => {
  it('writes « 1er » before a month name', () => {
    expect(frDate(new Date(2026, 9, 1), { weekday: 'long', day: 'numeric', month: 'long' })).toBe('jeudi 1er octobre');
    expect(frDate(new Date(2026, 9, 1), { day: 'numeric', month: 'short' })).toBe('1er oct.');
  });

  it('leaves other days and numeric months alone', () => {
    expect(frDate(new Date(2026, 9, 11), { day: 'numeric', month: 'long' })).toBe('11 octobre');
    expect(frDate(new Date(2026, 9, 21), { day: 'numeric', month: 'long' })).toBe('21 octobre');
    expect(frDate(new Date(2026, 9, 1), { day: 'numeric', month: 'numeric' })).toBe('01/10');
  });

  it('formats like toLocaleString for every set of options the app uses, an invalid date included', () => {
    const d = new Date(2026, 9, 3, 18, 5);
    for (const o of [
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' },
      { day: 'numeric', month: 'short', year: 'numeric' },
      { hour: '2-digit', minute: '2-digit' },
    ] as const) expect(frDate(d, o)).toBe(d.toLocaleString('fr-FR', o));
    expect(frDate(new Date(NaN), { day: 'numeric' })).toBe('Invalid Date');
  });

  it('builds one formatter per set of options (a new one per call cost ~60 µs, three times per History card)', () => {
    const Real = Intl.DateTimeFormat;
    const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (...args: ConstructorParameters<typeof Real>) {
      return new Real(...args);
    });
    const options = { day: '2-digit', month: 'long', year: '2-digit' } as const; // used nowhere else: not built yet
    frDate(new Date(2026, 9, 1), options);
    frDate(new Date(2026, 9, 2), { ...options });
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe('date de naissance', () => {
  it("l'âge change le jour de l'anniversaire, aussi à l'ouest de l'UTC (Martinique, Québec)", () => {
    const previous = process.env.TZ;
    process.env.TZ = 'America/Martinique';
    try {
      expect(ageFrom('2000-10-05', new Date(2026, 9, 4, 22))).toBe(25); // la veille au soir : pas encore 26
      expect(ageFrom('2000-10-05', new Date(2026, 9, 5, 8))).toBe(26);
    } finally {
      process.env.TZ = previous;
    }
  });

  it("refuse une date qui n'existe pas (31 février, 29 février hors bissextile)", () => {
    expect([isRealDay('2000-02-31'), isRealDay('2001-02-29'), isRealDay('2000-04-31'), isRealDay('2000-02-29'), isRealDay('1990-12-31')])
      .toEqual([false, false, false, true, true]);
  });
});

describe('parseDecimal / decimalInput (champs de charge et de reps)', () => {
  it('lit la virgule française comme le point, vide = 0, refuse ce qui n\'est pas un nombre', () => {
    expect([parseDecimal('82,5'), parseDecimal('82.5'), parseDecimal('82,'), parseDecimal(''), parseDecimal(','), parseDecimal(' 12 ')])
      .toEqual([82.5, 82.5, 82, 0, 0, 12]);
    expect([parseDecimal('8a'), parseDecimal('-5'), parseDecimal('1e3'), parseDecimal('8,5,5')]).toEqual([null, null, null, null]);
  });

  it('affiche la virgule française, sans séparateur de milliers', () => {
    expect([decimalInput(82.5), decimalInput(1000), decimalInput(0)]).toEqual(['82,5', '1000', '0']);
  });
});

describe('shortDate', () => {
  it('adds the year only when it is not the current one, so a past session does not read as this year', () => {
    const now = new Date(2026, 9, 6);
    expect(shortDate(new Date(2026, 7, 1), now)).toBe('1er août');
    expect(shortDate(new Date(2025, 7, 1), now)).toBe('1er août 2025');
    expect(shortDate(new Date(2025, 11, 28), now)).toBe('28 déc. 2025');
  });
});
