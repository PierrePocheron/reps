import { describe, it, expect, beforeEach } from 'vitest';
import { applyThemeColor, getCurrentThemeColor, themeColors } from '../theme-colors';

describe('theme-colors', () => {
  beforeEach(() => {
    // Reset document styles before each test
    document.documentElement.style.removeProperty('--theme-color');
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--primary-foreground');
    document.documentElement.style.removeProperty('--theme-color-light');
    document.documentElement.style.removeProperty('--theme-color-dark');
  });

  // ==================== APPLY THEME COLOR ====================

  describe('applyThemeColor', () => {
    it('should set CSS variables for violet theme', () => {
      applyThemeColor('violet');
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-color')).toBe(themeColors.violet.hsl);
      expect(root.style.getPropertyValue('--primary')).toBe(themeColors.violet.hsl);
      expect(root.style.getPropertyValue('--primary-foreground')).toBe('210 40% 98%');
    });

    it('should set CSS variables for orange theme', () => {
      applyThemeColor('orange');
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--theme-color')).toBe(themeColors.orange.hsl);
    });

    it('should set CSS variables for all themes', () => {
      const themes: Array<keyof typeof themeColors> = ['violet', 'orange', 'green', 'blue', 'red', 'pink', 'grey', 'yellow'];
      themes.forEach((theme) => {
        applyThemeColor(theme);
        expect(document.documentElement.style.getPropertyValue('--theme-color')).toBe(themeColors[theme].hsl);
      });
    });

    it('should set theme-color-light (lighter variant)', () => {
      applyThemeColor('violet');
      const lightColor = document.documentElement.style.getPropertyValue('--theme-color-light');
      expect(lightColor).toBeTruthy();
      expect(lightColor).not.toBe(themeColors.violet.hsl);
    });

    it('should set theme-color-dark (darker variant)', () => {
      applyThemeColor('blue');
      const darkColor = document.documentElement.style.getPropertyValue('--theme-color-dark');
      expect(darkColor).toBeTruthy();
    });
  });

  // ==================== GET CURRENT THEME COLOR ====================

  describe('getCurrentThemeColor', () => {
    it('should return violet by default when no theme is set', () => {
      const color = getCurrentThemeColor();
      expect(color).toBe('violet');
    });

    it('should return the currently applied theme color', () => {
      applyThemeColor('blue');
      const color = getCurrentThemeColor();
      expect(color).toBe('blue');
    });

    it('should return violet for unknown HSL values', () => {
      document.documentElement.style.setProperty('--theme-color', '999 999% 999%');
      const color = getCurrentThemeColor();
      expect(color).toBe('violet');
    });

    it('should correctly identify orange theme', () => {
      applyThemeColor('orange');
      expect(getCurrentThemeColor()).toBe('orange');
    });

    it('should correctly identify green theme', () => {
      applyThemeColor('green');
      expect(getCurrentThemeColor()).toBe('green');
    });
  });
});
