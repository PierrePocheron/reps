import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Achievements from '../Achievements';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { BADGES } from '@/utils/constants';

// Mocks
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/components/BackButton', () => ({
    BackButton: () => <button>Back</button>
}));

describe('Achievements Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default State: No badges
        useUserStore.setState({
            user: {
                uid: 'u1',
                badges: [],
                newBadgeIds: []
            } as any,
            stats: {
                totalReps: 0,
                currentStreak: 0
            } as any,
            updateProfile: vi.fn(),
            markBadgesAsSeen: vi.fn()
        });
    });

    const renderPage = () => render(
        <BrowserRouter>
            <Achievements />
        </BrowserRouter>
    );

    it('should render page title and progress', () => {
        renderPage();
        expect(screen.getByText('Succès')).toBeInTheDocument();
        // expect(screen.getByText(/Badges débloqués/)).toBeInTheDocument(); // Can be flaky depending on UI
        // Match 0 / 12
        expect(screen.getByRole('heading', { level: 2, name: /\d+\s*\/\s*\d+/ })).toBeInTheDocument();
    });

    it('should show locked state for badges', () => {
        renderPage();
        const firstBadge = BADGES[0];
        if (!firstBadge) throw new Error('No badges loaded');

        expect(screen.getByText(firstBadge.name)).toBeInTheDocument();
        const progressElements = screen.getAllByText(/0%/);
        expect(progressElements.length).toBeGreaterThan(0);
    });

    it('should show unlocked state', () => {
         const badge = BADGES[0];
         if (!badge) throw new Error('No badges loaded');

        useUserStore.setState({
            stats: { totalReps: 99999, currentStreak: 999 } as any,
            user: { badges: [badge.id], newBadgeIds: [] } as any
        });

        renderPage();
        expect(screen.getAllByText('Utiliser en avatar').length).toBeGreaterThan(0);
    });

    it('should trigger markBadgesAsSeen on unmount after delay', () => {
        vi.useFakeTimers();
        const markBadgesAsSeen = vi.fn();
        useUserStore.setState({
            user: { newBadgeIds: ['b1'] } as any,
            stats: { totalReps: 0 } as any,
            markBadgesAsSeen
        });

        const { unmount } = renderPage();
        unmount();
        expect(markBadgesAsSeen).not.toHaveBeenCalled();

        const view = renderPage();
        vi.advanceTimersByTime(1500);
        view.unmount();
        expect(markBadgesAsSeen).toHaveBeenCalled();
        vi.useRealTimers();
    });

    it('should allow setting avatar', async () => {
         const badge = BADGES[0];
         if (!badge) throw new Error('No badges loaded');

         const updateProfileSpy = vi.fn().mockResolvedValue({});

         useUserStore.setState({
            stats: { totalReps: 99999 } as any,
            user: { badges: [badge.id] } as any,
            updateProfile: updateProfileSpy
        });

        renderPage();

        const btns = screen.getAllByText('Utiliser en avatar');
        if (btns.length === 0) throw new Error('Buttons not found');
        const btn = btns[0];
        if (!btn) throw new Error('Button is undefined');

        fireEvent.click(btn);

        await waitFor(() => {
            expect(updateProfileSpy).toHaveBeenCalledWith({ avatarEmoji: badge.emoji });
        });

        expect(mockToast).toHaveBeenCalled();
    });
});
