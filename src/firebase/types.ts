import { Timestamp } from 'firebase/firestore';

/**
 * Types TypeScript pour les données Firebase
 */

// Type pour l'utilisateur
export interface User {
  uid: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  searchName?: string; // Lowercase display name for search
  avatarEmoji?: string;
  email: string;
  birthDate?: string; // YYYY-MM-DD
  height?: number; // en cm
  weight?: number; // en kg
  gender?: 'male' | 'female' | 'other';
  colorTheme?: 'violet' | 'orange' | 'green' | 'blue' | 'red' | 'pink' | 'grey' | 'yellow';
  totalReps: number;
  totalSessions: number;
  totalCalories?: number;
  badges: string[];
  friends: string[];
  repButtons?: number[]; // Custom rep buttons (e.g. [5, 10])
  lastUsernameChange?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  morningSessions?: number;
  lunchSessions?: number;
  nightSessions?: number;
  exercisesDistribution?: {
    name: string;
    emoji: string;
    totalReps: number;
    totalCalories: number;
    count: number;
  }[];
}

// Type pour un exercice
export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  userId?: string; // undefined pour les exercices par défaut
  createdAt?: Timestamp;
  // properties for dynamic calorie calculation
  met?: number; // Metabolic Equivalent of Task
  timePerRep?: number; // Time under tension per rep in seconds
  caloriesPerRep?: number; // Legacy or fixed value fallback
}

// Type pour un exercice dans une session
export interface SessionExercise {
  name: string;
  emoji: string;
  reps: number;
}

// Type pour une session d'entraînement
export interface Session {
  sessionId: string;
  userId: string;
  date: Timestamp;
  duration: number; // en secondes
  exercises: SessionExercise[];
  totalReps: number;
  totalCalories?: number;
  createdAt: Timestamp;
}

// Type pour une demande d'ami
export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromAvatarEmoji?: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}

// Type pour une notification
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'reminder' | 'friend_activity' | 'achievement';
  read: boolean;
  createdAt: Timestamp;
}

// Type pour une phrase motivante
export interface MotivationalPhrase {
  id: string;
  text: string;
  emoji?: string;
  createdAt: Timestamp;
}

// Type pour les stats d'un utilisateur
export interface UserStats {
  totalReps: number;
  totalSessions: number;
  totalCalories?: number;
  averageRepsPerSession: number;
  averageDuration: number; // en secondes
  averageExercises: number;
  lastSessionDate?: Timestamp;
  lastSessionReps?: number;
  currentStreak: number; // jours consécutifs
  longestStreak: number;
  morningSessions: number; // 7h-9h
  lunchSessions: number; // 12h-14h
  nightSessions: number; // > 23h
  exercisesDistribution: {
    name: string;
    emoji: string;
    totalReps: number;
    totalCalories: number;
    count: number; // Number of times performed (sessions)
  }[];
}

// Type pour un badge
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  threshold: number;
  category: 'total_reps' | 'streak' | 'total_sessions' | 'time_morning' | 'time_lunch' | 'time_night' | 'total_calories';
  color: string;
}
