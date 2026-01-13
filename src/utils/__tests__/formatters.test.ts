import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDateShort,
  formatDuration,
  formatDurationLong,
  formatNumber,
  formatReps,
  formatRelativeDate
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
    it('should format seconds only', () => {
      expect(formatDurationLong(45)).toBe('45s');
    });
    it('should format minutes and seconds', () => {
      expect(formatDurationLong(125)).toBe('2min 05s');
    });
    it('should format hours and minutes', () => {
      expect(formatDurationLong(3665)).toBe('1h 1min');
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
