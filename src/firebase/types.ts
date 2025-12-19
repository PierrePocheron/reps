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
  photoURL?: string;
  email: string;
  birthDate?: string; // YYYY-MM-DD
  height?: number; // en cm
  weight?: number; // en kg
  colorTheme?: 'violet' | 'orange' | 'green' | 'blue' | 'red' | 'pink' | 'grey' | 'yellow';
  totalReps: number;
  totalSessions: number;
  badges: string[];
  friends: string[];
  repButtons?: number[]; // Custom rep buttons (e.g. [5, 10])
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Type pour un exercice
export interface Exercise {
  id: string;
  name: string;
  emoji: string;
  userId?: string; // undefined pour les exercices par défaut
  createdAt?: Timestamp;
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
  createdAt: Timestamp;
}

// Type pour une demande d'ami
export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  fromPhotoURL?: string;
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
  averageRepsPerSession: number;
  averageDuration: number; // en secondes
  averageExercises: number;
  lastSessionDate?: Timestamp;
  lastSessionReps?: number;
  currentStreak: number; // jours consécutifs
  longestStreak: number;
}

// Type pour un badge
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  threshold: number;
  category: 'total_reps' | 'streak' | 'total_sessions';
  color: string;
}
