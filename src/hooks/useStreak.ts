import { useEffect } from 'react';
import { useUserStore } from '@/store/userStore';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { getDayIndex } from '@/firebase/challenges';

/**
 * useStreak Hook
 * Automatically manages user's daily streak.
 * Logic:
 * - Checks 'lastConnection' timestamp.
 * - If lastConnection was Yesterday: Streak + 1.
 * - If lastConnection was Today: Do nothing.
 * - If lastConnection was Older: Streak = 1.
 */
export function useStreak() {
    const { user } = useUserStore();

    const userId = user?.uid;
    const lastConnection = user?.lastConnection;
    const currentStreak = user?.currentStreak;
    const longestStreak = user?.longestStreak;

    useEffect(() => {
        if (!userId) return;

        const updateStreak = async (uid: string, newStreak: number, date: Date) => {
            const userRef = doc(db, 'users', uid);
            const timestamp = Timestamp.fromDate(date);

            try {
                await updateDoc(userRef, {
                    currentStreak: newStreak,
                    lastConnection: timestamp,
                    longestStreak: longestStreak ? Math.max(longestStreak, newStreak) : newStreak
                });
                console.log(`🔥 Streak updated: ${newStreak}`);
            } catch (err) {
                console.error("Error updating streak:", err);
            }
        };

        const checkStreak = async () => {
            const today = new Date();
            const lastConnectionDate = lastConnection?.toDate();

            // If no last connection, it's day 1
            if (!lastConnectionDate) {
                await updateStreak(userId, 1, today);
                return;
            }

            const refDate = Timestamp.fromDate(new Date(2024, 0, 1));
            const todayIndex = getDayIndex(refDate, today);
            const lastIndex = getDayIndex(refDate, lastConnectionDate);
            const diff = todayIndex - lastIndex;

            if (diff === 0) {
                return;
            } else if (diff === 1) {
                await updateStreak(userId, (currentStreak || 0) + 1, today);
            } else {
                await updateStreak(userId, 1, today);
            }
        };

        checkStreak();
    }, [userId, lastConnection, currentStreak, longestStreak]);
}
