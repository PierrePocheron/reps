/**
 * Couleurs de thème personnalisables pour l'application
 * Chaque couleur a des variantes light et dark pour s'adapter au mode clair/sombre
 */
export type ThemeColor = 'violet' | 'orange' | 'green' | 'blue' | 'red' | 'pink' | 'grey' | 'yellow';

export const themeColors: Record<ThemeColor, { name: string; emoji: string; hsl: string }> = {
  violet: {
    name: 'Violet',
    emoji: '😈',
    hsl: '262 83% 58%',
  },
  grey: {
    name: 'Gris',
    emoji: '💣',
    hsl: '240 5% 50%', // Darker grey
  },
  yellow: {
    name: 'Jaune',
    emoji: '⚡️',
    hsl: '45 93% 47%',
  },
  blue: {
    name: 'Bleu',
    emoji: '🌊',
    hsl: '217 91% 60%',
  },
  orange: {
    name: 'Orange',
    emoji: '💥',
    hsl: '25 95% 53%',
  },
  green: {
    name: 'Vert',
    emoji: '🧩',
    hsl: '142 70% 50%',
  },
  red: {
    name: 'Rouge',
    emoji: '👺',
    hsl: '0 84% 60%',
  },
  pink: {
    name: 'Rose',
    emoji: '🎀',
    hsl: '330 81% 60%',
  },
};

const luminance = (hsl: string): number => {
  const [h = 0, sat = 0, light = 0] = hsl.split(' ').map(parseFloat);
  const s = sat / 100, l = light / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(8) + 0.0722 * channel(4);
};

/** WCAG contrast ratio of an "H S% L%" colour against white. */
export const contrastWithWhite = (hsl: string): number => 1.05 / (luminance(hsl) + 0.05);

/**
 * Accent colour used as text on a light background: same hue and saturation, darkened only as much as AA (4.5:1)
 * requires on the app's tinted backgrounds (5.6:1 against white) (light-mode counterpart of the `.dark .text-primary` rule). Button backgrounds keep the original (#67).
 */
export function readableOnWhite(hsl: string): string {
  const [h, s, l = '0%'] = hsl.split(' ');
  for (let light = parseFloat(l); light > 0; light--) {
    const candidate = `${h} ${s} ${light}%`;
    if (contrastWithWhite(candidate) >= 5.6) return light === parseFloat(l) ? hsl : candidate; // margin for tinted chips and cards
  }
  return `${h} ${s} 0%`;
}

/**
 * Applique une couleur de thème au document
 * Met à jour les variables CSS pour la couleur primaire
 */
export function applyThemeColor(color: ThemeColor) {
  const root = document.documentElement;
  const themeColor = themeColors[color];

  if (themeColor) {
    root.style.setProperty('--theme-color', themeColor.hsl);
    // On met à jour la couleur primaire de Tailwind/Shadcn
    root.style.setProperty('--primary', themeColor.hsl);
    root.style.setProperty('--primary-text', readableOnWhite(themeColor.hsl));
    // On force le texte en blanc pour les boutons primaires colorés (pour le contraste)
    root.style.setProperty('--primary-foreground', '210 40% 98%');

    root.style.setProperty('--theme-color-light', themeColor.hsl.replace(/\d+%/, (match) => {
      const value = parseInt(match);
      return `${Math.min(value + 10, 100)}%`;
    }));
    root.style.setProperty('--theme-color-dark', themeColor.hsl.replace(/\d+%/, (match) => {
      const value = parseInt(match);
      return `${Math.max(value - 10, 0)}%`;
    }));
  }
}

/**
 * Récupère la couleur de thème actuelle depuis le document
 */
export function getCurrentThemeColor(): ThemeColor {
  const root = document.documentElement;
  const themeColor = root.style.getPropertyValue('--theme-color');

  // Par défaut, retourne violet si aucune couleur n'est définie
  if (!themeColor) {
    return 'violet';
  }

  // Trouve la couleur correspondante
  for (const [key, value] of Object.entries(themeColors)) {
    if (value.hsl === themeColor) {
      return key as ThemeColor;
    }
  }

  return 'violet';
}

