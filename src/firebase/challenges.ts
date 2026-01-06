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
import { calculateDynamicCalories } from '@/utils/calories';
import { User, SessionExercise } from './types';
import { DEFAULT_EXERCISES, MAX_ACTIVE_CHALLENGES } from '@/utils/constants';

// --- Types ---

export type ChallengeLogic = 'progressive' | 'fixed';
export type ChallengeType = 'reps';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'extreme'; // Added extreme

export interface ChallengeDefinition {
  id: string;
  exerciseId: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  logic: ChallengeLogic;
  durationDays: number;
  baseAmount: number;
  increment: number;
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
  definitionSnapshot?: ChallengeDefinition; // Helper for custom challenges
  startDate: Timestamp;
  lastLogDate: Timestamp | null;
  // Index of current day (0 to durationDays - 1)
  totalProgress: number;
  status: 'active' | 'completed' | 'abandoned';
  history: ChallengeHistoryEntry[];
}

// --- Templates ---
export const CHALLENGE_TEMPLATES: ChallengeDefinition[] = [
  // EASY (2)
  {
    id: 'c_squats_easy',
    exerciseId: 'squats',
    title: 'Squats Débutant',
    description: '14 jours pour renforcer tes jambes en douceur.',
    difficulty: 'easy',
    logic: 'progressive',
    durationDays: 14,
    baseAmount: 20,
    increment: 2
  },
  {
    id: 'c_abs_easy',
    exerciseId: 'abs',
    title: 'Abdos Express',
    description: 'Une routine de 3 semaines pour un core solide.',
    difficulty: 'easy',
    logic: 'progressive',
    durationDays: 21,
    baseAmount: 10,
    increment: 2
  },

  // MEDIUM (2)
  {
    id: 'c_pushups_medium',
    exerciseId: 'pushups',
    title: 'Pompes Classique',
    description: 'Le grand classique pour des pecs en acier.',
    difficulty: 'medium',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 15,
    increment: 1
  },
  {
    id: 'c_dips_medium',
    exerciseId: 'dips',
    title: 'Dips Progression',
    description: 'Développe tes triceps et tes épaules.',
    difficulty: 'medium',
    logic: 'progressive',
    durationDays: 30,
    baseAmount: 5,
    increment: 1
  },

  // HARD (2)
  {
    id: 'c_pullups_hard',
    exerciseId: 'pullups',
    title: 'Tractions Pro',
    description: 'L\'exercice roi pour le dos.',
    difficulty: 'hard',
    logic: 'progressive',
    durationDays: 45,
    baseAmount: 5,
    increment: 1
  },
  {
    id: 'c_lateral_hard',
    exerciseId: 'lateral_raises',
    title: 'Épaules 3D',
    description: 'Volume maximal pour des épaules larges.',
    difficulty: 'hard',
    logic: 'progressive',
    durationDays: 60,
    baseAmount: 15,
    increment: 3
  },

  // EXTREME (2)
  {
    id: 'c_pushups_extreme',
    exerciseId: 'pushups',
    title: 'Pompes Spartan',
    description: '100 jours pour devenir une machine.',
    difficulty: 'extreme',
    logic: 'progressive',
    durationDays: 100,
    baseAmount: 20,
    increment: 2
  },
  {
    id: 'c_pullups_extreme',
    exerciseId: 'pullups',
    title: 'Tractions Elite',
    description: 'Un défi mental et physique hors normes.',
    difficulty: 'extreme',
    logic: 'progressive',
    durationDays: 180,
    baseAmount: 8,
    increment: 2
  }
];

// --- Helpers ---

export const getChallengeDef = (id: string) => CHALLENGE_TEMPLATES.find(c => c.id === id);

export const getTargetForDay = (challenge: ChallengeDefinition, dayIndex: number): number => {
  if (challenge.logic === 'fixed') return challenge.baseAmount;
  // Progressive: base + (day * increment)
  return challenge.baseAmount + (dayIndex * challenge.increment);
};

// Calculate total expected reps for the entire duration
export const calculateChallengeTotalReps = (def: ChallengeDefinition): number => {
    if (def.logic === 'fixed') {
        return def.baseAmount * def.durationDays;
    }
    // Arithmetic progression sum: S = n/2 * (2a + (n-1)d)
    const n = def.durationDays;
    const a = def.baseAmount;
    const d = def.increment;
    return Math.round((n / 2) * (2 * a + (n - 1) * d));
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

// 1. Join a Challenge (Standard)
export const joinChallenge = async (userId: string, challengeId: string): Promise<string> => {
  const def = getChallengeDef(challengeId);
  if (!def) throw new Error("Challenge template not found");

  // Check Limit
  const activeQ = query(
    collection(db, 'user_challenges'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  );
  const activeSnap = await getDocs(activeQ);
  if (activeSnap.size >= MAX_ACTIVE_CHALLENGES) {
      throw new Error(`Limite atteinte : Vous ne pouvez avoir que ${MAX_ACTIVE_CHALLENGES} défis actifs en même temps.`);
  }

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
    definitionSnapshot: def, // Snapshot standard templates too
    startDate: Timestamp.now(),
    lastLogDate: null,
    totalProgress: 0,
    status: 'active',
    history: []
  };

  await setDoc(newChallengeRef, userChallenge);
  return newChallengeRef.id;
};

// Helper to determine custom challenge params (Centralized for consistency)
export const getCustomChallengeParams = (difficulty: 'easy' | 'medium' | 'hard' | 'extreme', exerciseId: string) => {
    let base = 1;
    let inc = 1;

    switch (difficulty) {
        case 'easy': base = 5; inc = 1; break;
        case 'medium': base = 10; inc = 2; break;
        case 'hard': base = 20; inc = 3; break;
        case 'extreme': base = 30; inc = 5; break;
    }

    // Adjust for specific exercises (e.g. Pullups/Dips are harder than Pushups/Squats)
    if (exerciseId === 'pullups' || exerciseId === 'dips') {
        base = Math.max(1, Math.round(base / 3));
        inc = Math.max(1, Math.round(inc / 2));
    }

    return { base, inc };
};

// 1.5 Create Custom Challenge
export const createCustomChallenge = async (
    userId: string,
    exerciseId: string,
    duration: number,
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
): Promise<string> => {
    // A. Determine Parameters
    const { base, inc } = getCustomChallengeParams(difficulty, exerciseId);

    // Check Limit
    const activeQ = query(
        collection(db, 'user_challenges'),
        where('userId', '==', userId),
        where('status', '==', 'active')
    );
    const activeSnap = await getDocs(activeQ);
    if (activeSnap.size >= MAX_ACTIVE_CHALLENGES) {
        throw new Error(`Limite atteinte : Vous ne pouvez avoir que ${MAX_ACTIVE_CHALLENGES} défis actifs en même temps.`);
    }

    // B. Build Definition
    const exerciseDef = DEFAULT_EXERCISES.find(e => e.id === exerciseId);
    const exerciseName = exerciseDef?.name || 'Exercice';

    const definition: ChallengeDefinition = {
        id: `custom_${Date.now()}`, // Unique ID for this custom instance
        exerciseId,
        title: `Défi ${exerciseName}`,
        description: `Objectif personnalisé : ${difficulty.toUpperCase()}.`,
        difficulty,
        logic: 'progressive',
        durationDays: duration,
        baseAmount: base,
        increment: inc
    };

    // C. Create UserChallenge
    const newChallengeRef = doc(collection(db, 'user_challenges'));
    const userChallenge: UserChallenge = {
        id: newChallengeRef.id,
        userId,
        challengeId: definition.id,
        definitionSnapshot: definition,
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

            // USE SNAPSHOT FIRST
            const def = userChallenge.definitionSnapshot || getChallengeDef(userChallenge.challengeId);
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
                     name: exerciseDef.name,
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
            const userData = userDoc.data() as User;

            // Calculate Calories precisely
            const calories = Math.round(calculateDynamicCalories(userData, exerciseDef, reps));

            // E. Updates

            // 1. Create Session
            transaction.set(sessionRef, {
                ...sessionData,
                totalCalories: calories // Add computed calories to session document
            });

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
