/**
 * Couleurs de thème personnalisables pour l'application
 * Chaque couleur a des variantes light et dark pour s'adapter au mode clair/sombre
 */
export type ThemeColor = 'violet' | 'orange' | 'green' | 'blue' | 'red' | 'pink';

export const themeColors: Record<ThemeColor, { name: string; emoji: string; hsl: string }> = {
  violet: {
    name: 'Violet',
    emoji: '💜',
    hsl: '262 83% 58%',
  },
  orange: {
    name: 'Orange',
    emoji: '🧡',
    hsl: '25 95% 53%',
  },
  green: {
    name: 'Vert',
    emoji: '💚',
    hsl: '142 76% 36%',
  },
  blue: {
    name: 'Bleu',
    emoji: '💙',
    hsl: '217 91% 60%',
  },
  red: {
    name: 'Rouge',
    emoji: '❤️',
    hsl: '0 84% 60%',
  },
  pink: {
    name: 'Rose',
    emoji: '💗',
    hsl: '330 81% 60%',
  },
};

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

