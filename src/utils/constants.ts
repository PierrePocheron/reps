import type { Exercise, Badge } from '@/firebase/types';

/**
 * Exercices par défaut disponibles dans l'application
 */
export const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: 'pushups',
    name: 'Pompes',
    emoji: '💪',
    met: 4.5,
    timePerRep: 2.2,
  },
  {
    id: 'dips',
    name: 'Dips',
    emoji: '🏋️',
    met: 7.0,
    timePerRep: 2.5,
  },
  {
    id: 'squats',
    name: 'Squats',
    emoji: '🦵',
    met: 5.0,
    timePerRep: 2.5,
  },
  {
    id: 'pullups',
    name: 'Tractions',
    emoji: '🤸',
    met: 8.0,
    timePerRep: 3.0,
  },
  {
    id: 'abs',
    name: 'Abdos',
    emoji: '🔥',
    met: 3.0,
    timePerRep: 2.0,
  },
  {
    id: 'lateral_raises',
    name: 'Élévations Lat.',
    emoji: '🦅',
    met: 3.5,
    timePerRep: 2.5,
  },
];

/**
 * Badges disponibles avec leurs seuils
 */
export const BADGES: Badge[] = [
  // Special
  {
    id: 'poussin',
    name: "Poussin",
    description: 'Bienvenue le sang',
    emoji: '🐥',
    threshold: 0,
    category: 'total_reps', // Hack pour l'afficher, ou on pourrait ajouter une catégorie "special"
    color: 'yellow',
  },

  // Total Reps
  {
    id: 'mosquito',
    name: "Tié un moustique",
    description: '1000 reps accomplies',
    emoji: '🦟',
    threshold: 1000,
    category: 'total_reps',
    color: 'gray',
  },
  {
    id: 'tiger',
    name: "Tié un tigre",
    description: '2000 reps accomplies',
    emoji: '🐯',
    threshold: 2000,
    category: 'total_reps',
    color: 'orange',
  },
  {
    id: 'triple-monster',
    name: 'Triple monstre',
    description: '3000 reps accomplies',
    emoji: '💥',
    threshold: 3000,
    category: 'total_reps',
    color: 'red',
  },
  {
    id: 'jaguar',
    name: "C'est pas facil hein",
    description: '4000 reps accomplies',
    emoji: '🐆',
    threshold: 4000,
    category: 'total_reps',
    color: 'yellow',
  },
  {
    id: 'brain',
    name: 'Bah super Nils',
    description: '5000 reps accomplies',
    emoji: '🧠',
    threshold: 5000,
    category: 'total_reps',
    color: 'blue',
  },
  {
    id: 'zen',
    name: "Oooh là j'suis bieng",
    description: '6000 reps accomplies',
    emoji: '😌',
    threshold: 6000,
    category: 'total_reps',
    color: 'green',
  },
  {
    id: 'grandingo',
    name: 'Oh ta grand-mère',
    description: '7000 reps accomplies',
    emoji: '😤',
    threshold: 7000,
    category: 'total_reps',
    color: 'purple',
  },

  // Streaks (Série actuelle)
  {
    id: 'streak-3',
    name: 'Le début',
    description: '3 jours consécutifs',
    emoji: '🔥',
    threshold: 3,
    category: 'streak',
    color: 'orange',
  },
  {
    id: 'streak-7',
    name: 'Semaine de feu',
    description: '7 jours consécutifs',
    emoji: '🧨',
    threshold: 7,
    category: 'streak',
    color: 'red',
  },
  {
    id: 'streak-30',
    name: 'Discipline de fer',
    description: '30 jours consécutifs',
    emoji: '🗿',
    threshold: 30,
    category: 'streak',
    color: 'gray',
  },

  // Total Sessions
  {
    id: 'sessions-10',
    name: 'Régulier',
    description: '10 séances terminées',
    emoji: '📅',
    threshold: 10,
    category: 'total_sessions',
    color: 'blue',
  },
  {
    id: 'sessions-50',
    name: 'Acharné',
    description: '50 séances terminées',
    emoji: '🏋️',
    threshold: 50,
    category: 'total_sessions',
    color: 'purple',
  },
  {
    id: 'sessions-100',
    name: 'Légende',
    description: '100 séances terminées',
    emoji: '👑',
    threshold: 100,
    category: 'total_sessions',
    color: 'yellow',
  },

  // Calories
  {
    id: 'cal-cookie',
    name: "La petite douceur",
    description: '100 kcal brûlées',
    emoji: '🍪',
    threshold: 100,
    category: 'total_calories',
    color: 'yellow',
  },
  {
    id: 'cal-burger',
    name: "Menu XL",
    description: '500 kcal brûlées',
    emoji: '🍔',
    threshold: 500,
    category: 'total_calories',
    color: 'orange',
  },
  {
    id: 'cal-pizza',
    name: "Pizza Party",
    description: '1000 kcal brûlées',
    emoji: '🍕',
    threshold: 1000,
    category: 'total_calories',
    color: 'red',
  },
  {
    id: 'cal-fire',
    name: "Fournaise",
    description: '5000 kcal brûlées',
    emoji: '🔥',
    threshold: 5000,
    category: 'total_calories',
    color: 'orange',
  },
  {
    id: 'cal-nuclear',
    name: "Centrale Nucléaire",
    description: '10000 kcal brûlées',
    emoji: '☢️',
    threshold: 10000,
    category: 'total_calories',
    color: 'green',
  },

  // Time Based
  {
    id: 'early_bird',
    name: "L'avenir appartient à...",
    description: '5 séances entre 7h et 9h',
    emoji: '🌅',
    threshold: 5,
    category: 'time_morning',
    color: 'orange',
  },
  {
    id: 'lunch_break',
    name: "Pas le temps de niaiser",
    description: '5 séances entre 12h et 14h',
    emoji: '🥪',
    threshold: 5,
    category: 'time_lunch',
    color: 'blue',
  },
  {
    id: 'night_owl',
    name: "Déterminé",
    description: '5 séances après 23h',
    emoji: '🦉',
    threshold: 5,
    category: 'time_night',
    color: 'purple',
  },
];

/**
 * Phrases motivantes par défaut (si Firestore n'est pas disponible)
 */
export const DEFAULT_MOTIVATIONAL_PHRASES = [
  { text: "C'est l'heure de pousser, champion 💪", emoji: '💪' },
  { text: "T'as promis à toi-même, allez !", emoji: '🔥' },
  { text: 'Chaque rep compte, continue !', emoji: '⚡' },
  { text: 'Tu es plus fort que tu ne le penses !', emoji: '💥' },
  { text: 'Un pas de plus vers tes objectifs !', emoji: '🚀' },
  { text: 'La discipline bat le talent !', emoji: '🏆' },
  { text: 'Tu vas y arriver, on y croit !', emoji: '✨' },
  { text: 'Le succès commence maintenant !', emoji: '🌟' },
];

/**
 * Obtenir les badges débloqués selon le nombre total de reps
 */
import type { UserStats } from '@/firebase/types';

/**
 * Obtenir les badges débloqués selon les stats de l'utilisateur
 */
export function getUnlockedBadges(stats: UserStats): Badge[] {
  return BADGES.filter((badge) => {
    switch (badge.category) {
      case 'total_reps':
        return stats.totalReps >= badge.threshold;
      case 'streak':
        return stats.currentStreak >= badge.threshold;
      case 'total_sessions':
        return stats.totalSessions >= badge.threshold;
      case 'time_morning':
        return (stats.morningSessions || 0) >= badge.threshold;
      case 'time_lunch':
        return (stats.lunchSessions || 0) >= badge.threshold;
      case 'time_night':
        return (stats.nightSessions || 0) >= badge.threshold;
      case 'total_calories':
        return (stats.totalCalories || 0) >= badge.threshold;
      default:
        return false;
    }
  });
}

/**
 * Obtenir le prochain badge à débloquer (le plus proche)
 */
export function getNextBadge(stats: UserStats): Badge | undefined {
  const unlockedBadges = getUnlockedBadges(stats);
  const lockedBadges = BADGES.filter((badge) => !unlockedBadges.includes(badge));

  if (lockedBadges.length === 0) return undefined;

  // Trouver le badge le plus proche d'être débloqué
  return lockedBadges.sort((a, b) => {
    const getProgress = (badge: Badge) => {
      switch (badge.category) {
        case 'total_reps':
          return stats.totalReps / badge.threshold;
        case 'streak':
          return stats.currentStreak / badge.threshold;
        case 'total_sessions':
          return stats.totalSessions / badge.threshold;
        case 'time_morning':
          return (stats.morningSessions || 0) / badge.threshold;
        case 'time_lunch':
          return (stats.lunchSessions || 0) / badge.threshold;
        case 'time_night':
          return (stats.nightSessions || 0) / badge.threshold;
        case 'total_calories':
          return (stats.totalCalories || 0) / badge.threshold;
        default:
          return 0;
      }
    };
    return getProgress(b) - getProgress(a); // Plus grand % en premier
  })[0];
}
