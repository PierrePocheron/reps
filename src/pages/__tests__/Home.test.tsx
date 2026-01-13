import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '../Home';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { useChallenges } from '@/hooks/useChallenges';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';

// Mocks
vi.mock('@/hooks/useAuth', () => ({
    useAuth: vi.fn(),
}));

vi.mock('@/hooks/useChallenges', () => ({
    useChallenges: vi.fn(),
}));

vi.mock('@/hooks/useStreak', () => ({
    useStreak: vi.fn(),
}));

vi.mock('@/hooks/useSession', () => ({
    useSession: vi.fn(),
}));

vi.mock('@/firebase/firestore', () => ({
    getLastSession: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/firebase/challenges', () => ({
    getDayIndex: vi.fn(() => 0),
}));

vi.mock('@/components/challenges/ChallengeCard', () => ({
    ChallengeCard: ({ activeChallenge }: any) => (
        <div data-testid="challenge-card">
            {activeChallenge ? `Challenge: ${activeChallenge.id}` : 'Discovery Card'}
        </div>
    )
}));

vi.mock('@/components/Timer', () => ({
    default: () => <div>Timer Component</div>
}));

describe('Home Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true, isLoading: false } as any);
        vi.mocked(useSession).mockReturnValue({ isActive: false, duration: 0 } as any);
        vi.mocked(useChallenges).mockReturnValue({ activeChallenges: [], isLoading: false, refreshChallenges: vi.fn() } as any);

        useUserStore.setState({ user: { uid: 'u1', displayName: 'Pierre' } as any });
    });

    const renderHome = () => render(
        <BrowserRouter>
            <Home />
        </BrowserRouter>
    );

    it('should show loading spinner initially if challenges are loading', () => {
        vi.mocked(useChallenges).mockReturnValue({
            activeChallenges: [],
            isLoading: true,
            refreshChallenges: vi.fn()
        } as any);

        renderHome();
        expect(screen.queryByText(/Défis en cours/)).not.toBeInTheDocument();
    });

    it('should render empty state (Discovery) when no active challenges', () => {
        // Default mock is empty
        renderHome();
        expect(screen.getByText('Discovery Card')).toBeInTheDocument();
        expect(screen.queryByText(/Défis en cours/)).not.toBeInTheDocument();
    });

    it('should render active challenges list', async () => {
         vi.mocked(useChallenges).mockReturnValue({
            activeChallenges: [
                { id: 'c1', history: [], startDate: {} },
                { id: 'c2', history: [], startDate: {} }
            ],
            isLoading: false,
            refreshChallenges: vi.fn()
        } as any);

        renderHome();

        // Use visible styling to verify presence?
        // Check finding by heading
        const heading = screen.getByRole('heading', { name: /Défis en cours/ });
        expect(heading).toBeInTheDocument();

        const cards = screen.getAllByTestId('challenge-card');
        expect(cards).toHaveLength(2);
    });

    it('should render Timer component', () => {
        vi.mocked(useSession).mockReturnValue({ isActive: true, duration: 100 } as any);
        renderHome();
        expect(screen.getByText('Séance en cours')).toBeInTheDocument();
    });
});
