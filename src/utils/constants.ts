import type { Exercise } from '@/firebase/types';

/**
 * Exercices par défaut disponibles dans l'application
 */
export const DEFAULT_EXERCISES: Exercise[] = [
  {
    id: 'pushups',
    name: 'Pompes',
    emoji: '💪',
  },
  {
    id: 'dips',
    name: 'Dips',
    emoji: '🏋️',
  },
  {
    id: 'squats',
    name: 'Squats',
    emoji: '🦵',
  },
  {
    id: 'pullups',
    name: 'Tractions',
    emoji: '🤸',
  },
  {
    id: 'abs',
    name: 'Abdos',
    emoji: '🔥',
  },
];

/**
 * Badges disponibles avec leurs seuils
 */
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  threshold: number; // Nombre de reps total requis
  color: string;
}

export const BADGES: Badge[] = [
  {
    id: 'mosquito',
    name: "T'es un moustique",
    description: '1000 reps accomplies',
    emoji: '🦟',
    threshold: 1000,
    color: 'gray',
  },
  {
    id: 'tiger',
    name: "T'es un tigre",
    description: '2000 reps accomplies',
    emoji: '🐯',
    threshold: 2000,
    color: 'orange',
  },
  {
    id: 'triple-monster',
    name: 'Triple monstre',
    description: '3000 reps accomplies',
    emoji: '💥',
    threshold: 3000,
    color: 'red',
  },
  {
    id: 'jaguar',
    name: "C'est pas facil hein",
    description: '4000 reps accomplies',
    emoji: '🐆',
    threshold: 4000,
    color: 'yellow',
  },
  {
    id: 'brain',
    name: 'Bah super Nils',
    description: '5000 reps accomplies',
    emoji: '🧠',
    threshold: 5000,
    color: 'blue',
  },
  {
    id: 'zen',
    name: "Oooh là j'suis bieng",
    description: '6000 reps accomplies',
    emoji: '😌',
    threshold: 6000,
    color: 'green',
  },
  {
    id: 'grandingo',
    name: 'Oh ta grand-mère',
    description: '7000 reps accomplies',
    emoji: '😤',
    threshold: 7000,
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
export function getUnlockedBadges(totalReps: number): Badge[] {
  return BADGES.filter((badge) => totalReps >= badge.threshold);
}

/**
 * Obtenir le prochain badge à débloquer
 */
export function getNextBadge(totalReps: number): Badge | null {
  const unlockedBadges = getUnlockedBadges(totalReps);
  const nextBadge = BADGES.find((badge) => !unlockedBadges.includes(badge));
  return nextBadge || null;
}
