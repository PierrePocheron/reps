import type { Exercise, Badge, ExerciseCategory } from '@/firebase/types';

/**
 * Exercices par défaut disponibles dans l'application
 */
export const MAX_ACTIVE_CHALLENGES = 6;

export const EXERCISE_CATEGORIES: { id: ExerciseCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all', label: 'Tous', emoji: '⚡' },
  { id: 'chest', label: 'Poitrine', emoji: '💪' },
  { id: 'back', label: 'Dos', emoji: '🧗' },
  { id: 'legs', label: 'Jambes', emoji: '🦵' },
  { id: 'shoulders', label: 'Épaules', emoji: '🏋️' },
  { id: 'arms', label: 'Bras', emoji: '💈' },
  { id: 'core', label: 'Abdos', emoji: '🍫' },
  { id: 'cardio', label: 'Cardio', emoji: '🔥' },
];

export const DEFAULT_EXERCISES: Exercise[] = [
  // ─── Poitrine (Chest) ───────────────────────────────────────────────────
  {
    id: 'pushups',
    name: 'Pompes',
    emoji: '💪',
    category: 'chest',
    met: 4.5,
    timePerRep: 2.2,
  },
  {
    id: 'diamond_pushups',
    name: 'Pompes diamant',
    emoji: '💎',
    category: 'chest',
    met: 4.8,
    timePerRep: 2.2,
  },
  {
    id: 'wide_pushups',
    name: 'Pompes larges',
    emoji: '🤲',
    category: 'chest',
    met: 4.3,
    timePerRep: 2.2,
  },
  {
    id: 'decline_pushups',
    name: 'Pompes déclinées',
    emoji: '📐',
    category: 'chest',
    met: 5.0,
    timePerRep: 2.2,
  },
  {
    id: 'dips',
    name: 'Dips',
    emoji: '♣️',
    category: 'chest',
    met: 7.0,
    timePerRep: 2.5,
  },

  // ─── Dos (Back) ─────────────────────────────────────────────────────────
  {
    id: 'pullups',
    name: 'Tractions',
    emoji: '🧗',
    category: 'back',
    met: 8.0,
    timePerRep: 3.0,
  },
  {
    id: 'chin_ups',
    name: 'Tractions serrées',
    emoji: '🙌',
    category: 'back',
    met: 8.0,
    timePerRep: 3.0,
  },
  {
    id: 'inverted_rows',
    name: 'Rows inversés',
    emoji: '🔄',
    category: 'back',
    met: 5.0,
    timePerRep: 2.5,
  },
  {
    id: 'superman',
    name: 'Superman',
    emoji: '🦸',
    category: 'back',
    met: 3.0,
    timePerRep: 3.0,
  },

  // ─── Jambes (Legs) ──────────────────────────────────────────────────────
  {
    id: 'squats',
    name: 'Squats',
    emoji: '🦵',
    category: 'legs',
    met: 5.0,
    timePerRep: 2.5,
  },
  {
    id: 'jump_squats',
    name: 'Squats sautés',
    emoji: '⬆️',
    category: 'legs',
    met: 7.0,
    timePerRep: 2.0,
  },
  {
    id: 'lunges',
    name: 'Fentes avant',
    emoji: '🚶',
    category: 'legs',
    met: 4.0,
    timePerRep: 2.5,
  },
  {
    id: 'side_lunges',
    name: 'Fentes latérales',
    emoji: '↔️',
    category: 'legs',
    met: 4.0,
    timePerRep: 2.5,
  },
  {
    id: 'bulgarian_squats',
    name: 'Squats bulgares',
    emoji: '💺',
    category: 'legs',
    met: 5.5,
    timePerRep: 3.0,
  },
  {
    id: 'glute_bridge',
    name: 'Hip Thrust',
    emoji: '🍑',
    category: 'legs',
    met: 3.5,
    timePerRep: 2.5,
  },
  {
    id: 'calf_raises',
    name: 'Mollets',
    emoji: '🦶',
    category: 'legs',
    met: 2.5,
    timePerRep: 1.5,
  },

  // ─── Épaules (Shoulders) ────────────────────────────────────────────────
  {
    id: 'lateral_raises',
    name: 'Élévations lat.',
    emoji: '🥥',
    category: 'shoulders',
    met: 3.5,
    timePerRep: 2.5,
  },
  {
    id: 'pike_pushups',
    name: 'Pike Push-ups',
    emoji: '🔻',
    category: 'shoulders',
    met: 4.5,
    timePerRep: 2.5,
  },
  {
    id: 'shoulder_press',
    name: 'Développé épaules',
    emoji: '🏋️',
    category: 'shoulders',
    met: 4.0,
    timePerRep: 2.5,
  },
  {
    id: 'shoulder_taps',
    name: 'Shoulder Taps',
    emoji: '👆',
    category: 'shoulders',
    met: 3.0,
    timePerRep: 1.5,
  },

  // ─── Bras (Arms) ────────────────────────────────────────────────────────
  {
    id: 'tricep_dips',
    name: 'Dips triceps',
    emoji: '💈',
    category: 'arms',
    met: 5.5,
    timePerRep: 2.5,
  },
  {
    id: 'bicep_curls',
    name: 'Curls biceps',
    emoji: '🥊',
    category: 'arms',
    met: 3.0,
    timePerRep: 2.0,
  },
  {
    id: 'tricep_extensions',
    name: 'Extensions triceps',
    emoji: '🔧',
    category: 'arms',
    met: 3.5,
    timePerRep: 2.0,
  },
  {
    id: 'hammer_curls',
    name: 'Curls marteau',
    emoji: '🔨',
    category: 'arms',
    met: 3.0,
    timePerRep: 2.0,
  },

  // ─── Abdos / Core ───────────────────────────────────────────────────────
  {
    id: 'abs',
    name: 'Abdos',
    emoji: '🍫',
    category: 'core',
    met: 3.0,
    timePerRep: 2.0,
  },
  {
    id: 'leg_raises',
    name: 'Levées de jambes',
    emoji: '🦿',
    category: 'core',
    met: 3.5,
    timePerRep: 2.5,
  },
  {
    id: 'russian_twists',
    name: 'Russian Twists',
    emoji: '🌀',
    category: 'core',
    met: 3.0,
    timePerRep: 1.5,
  },
  {
    id: 'mountain_climbers',
    name: 'Mountain Climbers',
    emoji: '🏔️',
    category: 'core',
    met: 5.0,
    timePerRep: 1.0,
  },
  {
    id: 'v_ups',
    name: 'V-Ups',
    emoji: '✌️',
    category: 'core',
    met: 4.0,
    timePerRep: 2.5,
  },
  {
    id: 'bicycle_crunches',
    name: 'Crunches vélo',
    emoji: '🚴',
    category: 'core',
    met: 3.5,
    timePerRep: 1.5,
  },

  // ─── Cardio ─────────────────────────────────────────────────────────────
  {
    id: 'burpees',
    name: 'Burpees',
    emoji: '💀',
    category: 'cardio',
    met: 8.0,
    timePerRep: 4.0,
  },
  {
    id: 'jumping_jacks',
    name: 'Jumping Jacks',
    emoji: '⭐',
    category: 'cardio',
    met: 7.0,
    timePerRep: 1.5,
  },
  {
    id: 'high_knees',
    name: 'Montées de genoux',
    emoji: '🏃',
    category: 'cardio',
    met: 7.0,
    timePerRep: 1.0,
  },
  {
    id: 'box_jumps',
    name: 'Box Jumps',
    emoji: '📦',
    category: 'cardio',
    met: 8.5,
    timePerRep: 3.0,
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
