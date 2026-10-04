import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBadgeEvents } from '../useBadgeEvents';
import { useUserStore } from '@/store/userStore';
import { onSnapshot, writeBatch } from 'firebase/firestore';

// Mocks for custom hooks
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockPlay = vi.fn();
vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ play: mockPlay }),
}));

const mockHaptic = vi.fn();
vi.mock('@/hooks/useHaptic', () => ({
  useHaptic: () => ({ notification: mockHaptic }),
}));

describe('useBadgeEvents Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useUserStore.setState({ user: null });
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should subscribe to events when user is logged in', () => {
        useUserStore.setState({ user: { uid: 'u1' } as any });
        renderHook(() => useBadgeEvents());
        expect(onSnapshot).toHaveBeenCalled();
    });

    it('should not subscribe when user is not logged in', () => {
        renderHook(() => useBadgeEvents());
        expect(onSnapshot).not.toHaveBeenCalled();
    });

    it('should handle new badge event correctly', () => {
        useUserStore.setState({ user: { uid: 'u1' } as any });

        // Setup onSnapshot to trigger our callback immediately
        let snapshotCallback: any;
        (onSnapshot as any).mockImplementation((_query: any, cb: any) => {
            snapshotCallback = cb;
            return vi.fn(); // unsubscribe
        });

        renderHook(() => useBadgeEvents());

        expect(snapshotCallback).toBeDefined();

        // Simulate a new event
        const mockEventData = {
            badgeName: 'Test Badge',
            badgeEmoji: '🏆',
            createdAt: { toMillis: () => Date.now() } // Fresh event
        };

        const mockSnapshot = {
            docChanges: () => [{
                type: 'added',
                doc: {
                    id: 'event-123',
                    data: () => mockEventData,
                    metadata: { hasPendingWrites: true } // just written by this device
                }
            }]
        };

        // Trigger the callback
        snapshotCallback(mockSnapshot);

        // Should not happen immediately (1s delay)
        expect(mockPlay).not.toHaveBeenCalled();
        expect(mockToast).not.toHaveBeenCalled();

        // Fast-forward time
        vi.advanceTimersByTime(1000);

        // Now checks outcomes
        expect(mockPlay).toHaveBeenCalledWith('success');
        expect(mockHaptic).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: "Badge débloqué ! 🏆",
            description: "🏆 Test Badge"
        }));

        // The event stays: friends' activity feeds read it ("X a débloqué un badge")
        expect(writeBatch).not.toHaveBeenCalled();
    });

    it('does not replay the toast for an event read back from the server (app reloaded within the minute)', () => {
        useUserStore.setState({ user: { uid: 'u1' } as any });
        let snapshotCallback: any;
        (onSnapshot as any).mockImplementation((_q: any, cb: any) => { snapshotCallback = cb; return vi.fn(); });
        renderHook(() => useBadgeEvents());
        snapshotCallback({ docChanges: () => [{ type: 'added', doc: {
            id: 'event-synced',
            data: () => ({ badgeName: 'Test Badge', badgeEmoji: '🏆', createdAt: { toMillis: () => Date.now() - 5000 } }),
            metadata: { hasPendingWrites: false },
        } }] });
        vi.advanceTimersByTime(2000);
        expect(mockToast).not.toHaveBeenCalled();
    });

    it('should ignore old events (> 60s)', () => {
        useUserStore.setState({ user: { uid: 'u1' } as any });

        let snapshotCallback: any;
        (onSnapshot as any).mockImplementation((_q: any, cb: any) => {
            snapshotCallback = cb;
            return vi.fn();
        });

        renderHook(() => useBadgeEvents());

        const oldDate = Date.now() - 70000; // 70s ago

        const mockSnapshot = {
            docChanges: () => [{
                type: 'added',
                doc: {
                    id: 'event-old',
                    data: () => ({
                        badgeName: 'Old Badge',
                        createdAt: { toMillis: () => oldDate }
                    }),
                    metadata: { hasPendingWrites: true } // only the age filter is under test
                }
            }]
        };

        snapshotCallback(mockSnapshot);
        vi.advanceTimersByTime(2000);

        expect(mockPlay).not.toHaveBeenCalled();
    });
});
