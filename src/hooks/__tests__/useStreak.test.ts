import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStreak } from '../useStreak';
import { useUserStore } from '@/store/userStore';
import { updateDoc, Timestamp } from 'firebase/firestore';

// Mock getDayIndex to be deterministic
vi.mock('@/firebase/challenges', () => ({
  getDayIndex: vi.fn(),
}));
import { getDayIndex } from '@/firebase/challenges';

// Mock Firestore updateDoc (already global mock, but we want to spy on it specific to this test)
// Actually global mock is fine, we just need to import it to spy/assert.

describe('useStreak Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset store
        useUserStore.setState({ user: null });
    });

    it('should not do anything if user is not logged in', () => {
        renderHook(() => useStreak());
        expect(updateDoc).not.toHaveBeenCalled();
    });

    it('should initialize streak to 1 if first connection', async () => {
        // Setup User with no lastConnection
        useUserStore.setState({
            user: {
                uid: 'test-uid',
                currentStreak: 0,
                longestStreak: 0,
                lastConnection: null
            } as any
        });

        renderHook(() => useStreak());

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'mock-doc-id' }), // doc() mock returns this ID
                expect.objectContaining({
                    currentStreak: 1,
                    longestStreak: 1
                })
            );
        });
    });

    it('should increment streak if last connection was yesterday', async () => {
        // Mock getDayIndex to simulate "Yesterday vs Today"
        // diff = todayIndex - lastIndex
        // For streak++, diff should be 1
        (getDayIndex as any).mockReturnValueOnce(100).mockReturnValueOnce(99);
        // 100 (today) - 99 (yesterday) = 1

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        useUserStore.setState({
            user: {
                uid: 'test-uid',
                currentStreak: 5,
                longestStreak: 10,
                lastConnection: Timestamp.fromDate(yesterday)
            } as any
        });

        renderHook(() => useStreak());

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'mock-doc-id' }),
                expect.objectContaining({
                    currentStreak: 6,
                    longestStreak: 10 // Should not update max if 6 < 10
                })
            );
        });
    });

    it('should reset streak to 1 if last connection was > 1 day ago', async () => {
        // diff > 1
        (getDayIndex as any).mockReturnValueOnce(100).mockReturnValueOnce(90);
        // 100 - 90 = 10 days gap

        const longAgo = new Date();
        longAgo.setDate(longAgo.getDate() - 10);

        useUserStore.setState({
            user: {
                uid: 'test-uid',
                currentStreak: 5,
                longestStreak: 5,
                lastConnection: Timestamp.fromDate(longAgo)
            } as any
        });

        renderHook(() => useStreak());

        await waitFor(() => {
            expect(updateDoc).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'mock-doc-id' }),
                expect.objectContaining({
                    currentStreak: 1
                })
            );
        });
    });

    it('should do nothing if already connected today', async () => {
        // diff = 0
        (getDayIndex as any).mockReturnValueOnce(100).mockReturnValueOnce(100);

        useUserStore.setState({
            user: {
                uid: 'test-uid',
                currentStreak: 5,
                lastConnection: Timestamp.now()
            } as any
        });

        renderHook(() => useStreak());

        // Wait a tick
        await waitFor(() => {}, { timeout: 100 });

        expect(updateDoc).not.toHaveBeenCalled();
    });
});
