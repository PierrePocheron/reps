/**
 * Export centralisé de tous les modules Firebase
 */

// Configuration
export { default as app, auth, db, messaging } from './config';

// Authentification
export {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthChange,
  getCurrentUserProfile,
} from './auth';

// Firestore
export {
  // Users
  createUserDocument,
  getUserDocument,
  updateUserDocument,
  subscribeToUser,
  // Sessions
  createSession,
  getUserSessions,
  getSession,
  subscribeToUserSessions,
  // Exercises
  createExercise,
  getUserExercises,
  deleteExercise,
  // Stats
  calculateUserStats,
  updateUserStatsAfterSession,
  onUserStatsComputed,
  // Notifications
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markBadgesAsSeen,
  // Motivational phrases
  getRandomMotivationalPhrase,
} from './firestore';

// Offline
export {
  saveCurrentSessionToLocal,
  getCurrentSessionFromLocal,
  clearCurrentSessionFromLocal,
  isOffline,
  onNetworkChange,
} from './offline';
export type { LocalSession } from './offline';

// Types
export type {
  User,
  Exercise,
  Session,
  SessionExercise,
  Notification,
  MotivationalPhrase,
  UserStats,
} from './types';

