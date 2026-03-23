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
  // Streak System
  currentStreak: number;
  longestStreak: number;
  lastConnection: Timestamp | null;

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
  newBadgeIds?: string[];
}

export type ExerciseCategory = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';
export type WorkoutType = 'renforcement' | 'musculation';

// Type pour un exercice
export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  category?: ExerciseCategory;
  workoutType?: WorkoutType;
  imageUrl?: string; // URL image depuis Wger/Firebase Storage
  userId?: string; // undefined pour les exercices par défaut
  createdAt?: Timestamp;
  // properties for dynamic calorie calculation
  met?: number; // Metabolic Equivalent of Task
  timePerRep?: number; // Time under tension per rep in seconds
  caloriesPerRep?: number; // Legacy or fixed value fallback
}

// ─── Types Musculation ─────────────────────────────────────────────────────

// Un set planifié (poids + reps)
export interface PlannedSet {
  weight: number;         // kg
  reps: number;           // reps cibles
  actualReps?: number;    // reps réelles si différent
  actualWeight?: number;  // poids réel si différent
  completed: boolean;
  restDuration?: number;  // durée de repos effectuée (secondes)
}

// Exercice dans une séance musculation
export interface GymSessionExercise {
  exerciseId: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  sets: PlannedSet[];
}

// Séance musculation (collection séparée dans Firestore)
export interface GymSession {
  sessionId: string;
  userId: string;
  date: Timestamp;
  duration: number;       // secondes
  exercises: GymSessionExercise[];
  totalVolume: number;    // Σ(weight × reps) pour tous les sets complétés
  totalSets: number;
  createdAt: Timestamp;
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

// Template d'entraînement
export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  workoutType: WorkoutType;
  exerciseIds?: string[]; // pour renforcement
  muscuExercises?: {       // pour musculation
    exerciseId: string;
    sets: { reps: number; weight: number }[];
  }[];
  // Champs présents uniquement sur les templates utilisateur (Firestore)
  userId?: string;
  createdAt?: Timestamp;
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
