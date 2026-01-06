import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db } from './config';
import { SessionExercise } from './types';
import { DEFAULT_EXERCISES } from '@/utils/constants';

// --- Types ---

export type ChallengeLogic = 'progressive' | 'fixed';
export type ChallengeType = 'reps'; // Can be extended to 'time', 'distance' etc.
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';

export interface ChallengeDefinition {
  id: string;
  exerciseId: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  logic: ChallengeLogic;
  durationDays: number;
  baseAmount: number; // e.g. 1 rep
  increment: number;  // e.g. +1 rep/day
}

export interface ChallengeHistoryEntry {
  date: string; // ISO date YYYY-MM-DD
  amount: number;
  completed: boolean;
  catchUp?: boolean;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  startDate: Timestamp;
  lastLogDate: Timestamp | null;
  // Index of current day (0 to durationDays - 1)
  // Can be calculated from startDate, but useful to store progress
  totalProgress: number; // Total reps done
  status: 'active' | 'completed' | 'abandoned';
  history: ChallengeHistoryEntry[];
}

// --- Configuration (Templates) ---

export const CHALLENGE_TEMPLATES: ChallengeDefinition[] = [
  // Pompes
  {
    id: 'pushups_easy',
    exerciseId: 'pushups',
    title: 'Défi Pompes (Starter)',
    description: '1 pompe le premier jour, +1 chaque jour. Idéal pour débuter.',
    difficulty: 'easy',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 1,
    increment: 1,
  },
  {
    id: 'pushups_medium',
    exerciseId: 'pushups',
    title: 'Défi Pompes (Initié)',
    description: '5 pompes le premier jour, +2 chaque jour. Ça commence à chauffer.',
    difficulty: 'medium',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 5,
    increment: 2,
  },
  {
    id: 'pushups_hard',
    exerciseId: 'pushups',
    title: 'Défi Pompes (Guerrier)',
    description: '10 pompes le premier jour, +3 chaque jour. Pour les vrais.',
    difficulty: 'hard',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 10,
    increment: 3,
  },
   // Tractions
  {
    id: 'pullups_easy',
    exerciseId: 'pullups',
    title: 'Défi Tractions (Starter)',
    description: '1 traction le premier jour, +1 chaque jour.',
    difficulty: 'easy',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 1,
    increment: 1,
  },
  // Squats
  {
    id: 'squats_easy',
    exerciseId: 'squats',
    title: 'Défi Squats (Starter)',
    description: '5 squats le premier jour, +2 chaque jour.',
    difficulty: 'easy',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 5,
    increment: 2,
  },
   // Élévations Latérales
  {
    id: 'lateral_easy',
    exerciseId: 'lateral_raises',
    title: 'Épaules 3D (Starter)',
    description: '5 reps le premier jour, +1 chaque jour.',
    difficulty: 'easy',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 5,
    increment: 1,
  },
];

// --- Helpers ---

export const getChallengeDef = (id: string) => CHALLENGE_TEMPLATES.find(c => c.id === id);

export const getTargetForDay = (challenge: ChallengeDefinition, dayIndex: number): number => {
  if (challenge.logic === 'fixed') return challenge.baseAmount;
  // Progressive: base + (day * increment)
  return challenge.baseAmount + (dayIndex * challenge.increment);
};

export const getDayIndex = (startDate: Timestamp, targetDate: Date = new Date()): number => {
  const start = startDate.toDate();
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// --- Firestore Functions ---

// 1. Join a Challenge
export const joinChallenge = async (userId: string, challengeId: string): Promise<string> => {
  // Check if already active
  const q = query(
    collection(db, 'user_challenges'),
    where('userId', '==', userId),
    where('challengeId', '==', challengeId),
    where('status', '==', 'active')
  );

  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    throw new Error("Vous participez déjà à ce défi !");
  }

  const newChallengeRef = doc(collection(db, 'user_challenges'));
  const userChallenge: UserChallenge = {
    id: newChallengeRef.id,
    userId,
    challengeId,
    startDate: Timestamp.now(),
    lastLogDate: null,
    totalProgress: 0,
    status: 'active',
    history: []
  };

  await setDoc(newChallengeRef, userChallenge);
  return newChallengeRef.id;
};

// 2. Get User Active Challenges
export const getUserActiveChallenges = async (userId: string): Promise<UserChallenge[]> => {
    const q = query(
      collection(db, 'user_challenges'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);

    // Sort logic handled in formatting if needed, Firestore query simple here
    return snapshot.docs.map(d => d.data() as UserChallenge);
};

// 3. Smart Validation (The Magic Sauce)
export const validateChallengeDay = async (
    userChallengeId: string,
    userId: string,
    reps: number,
    validationDate: Date = new Date()
) => {
    try {
        await runTransaction(db, async (transaction) => {
            // A. Get Challenge Data
            const challengeRef = doc(db, 'user_challenges', userChallengeId);
            const challengeDoc = await transaction.get(challengeRef);
            if (!challengeDoc.exists()) throw new Error("Challenge not found");

            const userChallenge = challengeDoc.data() as UserChallenge;
            const def = getChallengeDef(userChallenge.challengeId);
            if (!def) throw new Error("Definition not found");

            // B. Calculate Day Index & Target
            const now = Timestamp.now();
            const dateStr = validationDate.toISOString().split('T')[0];

            // Check if already validated for this date
            if (userChallenge.history.some(h => h.date === dateStr && h.completed)) {
               throw new Error("Déjà validé pour cette date !");
            }

            // C. Create Session (Social + Stats + Leaderboard)
            const exerciseDef = DEFAULT_EXERCISES.find(e => e.id === def.exerciseId);
            if (!exerciseDef) throw new Error("Exercise definition not found");

            // Correct path: sessions/{userId}/userSessions/{sessionId}
            const sessionRef = doc(collection(db, 'sessions', userId, 'userSessions'));
            const sessionData = {
                sessionId: sessionRef.id,
                userId,
                date: now, // Always log 'now' for the session timestamp to appear in feed
                duration: 0, // Quick validation = 0 duration or minimal
                exercises: [{
                     id: def.exerciseId,
                     name: def.exerciseId === 'lateral_raises' ? 'Élévations Lat.' :
                           def.exerciseId === 'pushups' ? 'Pompes' :
                           def.exerciseId === 'pullups' ? 'Tractions' :
                           def.exerciseId === 'squats' ? 'Squats' :
                           def.exerciseId === 'dips' ? 'Dips' : def.exerciseId,
                     emoji: exerciseDef.emoji,
                     sets: 1,
                     reps: reps,
                     weight: 0
                } as SessionExercise],
                totalReps: reps,
                category: 'challenge', // Special category
                challengeId: userChallenge.challengeId,
                createdAt: now
            };

            // D. Update User Stats (Simplified manual update to ensure atomicity)
            // Note: updateUserStatsAfterSession usually expects a full session obj.
            // Here we do a direct increment for efficiency in the transaction.
            const userRef = doc(db, 'users', userId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User not found");

            // Calculate Calories roughly
            const met = exerciseDef.met || 3.0;
            const calories = Math.round(reps * (met / 2)); // Simplified algo

            // E. Updates

            // 1. Create Session
            transaction.set(sessionRef, sessionData);

            // 2. Update User Stats
            transaction.update(userRef, {
                totalReps: increment(reps),
                totalSessions: increment(1),
                totalCalories: increment(calories),
                lastActivity: now
            });

            // 3. Update Challenge State
            const newHistory = [
                ...userChallenge.history,
                { date: dateStr, amount: reps, completed: true, catchUp: getDayIndex(userChallenge.startDate, validationDate) < getDayIndex(userChallenge.startDate, new Date()) }
            ];

            // Check completion
            const dayIndex = getDayIndex(userChallenge.startDate, validationDate);
            const isFinished = dayIndex >= def.durationDays - 1;

            transaction.update(challengeRef, {
                lastLogDate: now,
                totalProgress: increment(reps),
                history: newHistory,
                status: isFinished ? 'completed' : 'active'
            });
        });

        return { success: true };
    } catch (e) {
        console.error("Validation error:", e);
        throw e;
    }
};

export const abandonChallenge = async (userChallengeId: string) => {
    await setDoc(doc(db, 'user_challenges', userChallengeId), { status: 'abandoned' }, { merge: true });
};
