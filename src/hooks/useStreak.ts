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

    useEffect(() => {
        if (!user) return;

        const updateStreak = async (uid: string, newStreak: number, date: Date) => {
            const userRef = doc(db, 'users', uid);
            const timestamp = Timestamp.fromDate(date);

            try {
                await updateDoc(userRef, {
                    currentStreak: newStreak,
                    lastConnection: timestamp,
                    longestStreak: user.longestStreak ? Math.max(user.longestStreak, newStreak) : newStreak
                });
                console.log(`🔥 Streak updated: ${newStreak}`);
            } catch (err) {
                console.error("Error updating streak:", err);
            }
        };

        const checkStreak = async () => {
            const today = new Date();
            const lastConnection = user.lastConnection?.toDate();

            // If no last connection, it's day 1
            if (!lastConnection) {
                await updateStreak(user.uid, 1, today);
                return;
            }

            const refDate = Timestamp.fromDate(new Date(2024, 0, 1));
            const todayIndex = getDayIndex(refDate, today);
            const lastIndex = getDayIndex(refDate, lastConnection);
            const diff = todayIndex - lastIndex;

            if (diff === 0) {
                return;
            } else if (diff === 1) {
                await updateStreak(user.uid, (user.currentStreak || 0) + 1, today);
            } else {
                await updateStreak(user.uid, 1, today);
            }
        };

        checkStreak();
    }, [user]);
}
