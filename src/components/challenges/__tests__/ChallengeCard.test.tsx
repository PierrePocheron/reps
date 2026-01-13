import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChallengeCard } from '../ChallengeCard';
import { BrowserRouter } from 'react-router-dom';
import { validateChallengeDay } from '@/firebase/challenges';

// Mocks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useSound', () => ({
  useSound: () => ({ play: vi.fn() }),
}));

// Mock canvas-confetti (default export)
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock Firebase Functions
vi.mock('@/firebase/challenges', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/firebase/challenges')>();
    return {
        ...actual,
        validateChallengeDay: vi.fn(),
        abandonChallenge: vi.fn(),
    };
});

// Mock NumberTicker to avoid animation wait
vi.mock('@/components/ui/NumberTicker', () => ({
    NumberTicker: ({ value }: { value: number }) => <span>{value}</span>
}));


const mockTemplate = {
    id: 'pushups_easy',
    title: 'Pompes Débutant',
    description: 'Description test',
    difficulty: 'easy',
    durationDays: 30,
    exerciseId: 'pushups',
    baseAmount: 10,
    increment: 2,
    restDaysPattern: [3, 7]
};

const mockActiveChallenge = {
    id: 'user_c1',
    challengeId: 'pushups_easy',
    userId: 'u1',
    startDate: { toDate: () => new Date() } as any, // Today
    history: [], // Day 1 not done
    totalProgress: 0,
    status: 'active',
    definitionSnapshot: mockTemplate
};

describe('ChallengeCard Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderCard = (props: any) => {
        return render(
            <BrowserRouter>
                <ChallengeCard userId="u1" {...props} />
            </BrowserRouter>
        );
    };

    it('should render template (not active) correctly', () => {
        renderCard({ template: mockTemplate });

        expect(screen.getByText('Pompes Débutant')).toBeInTheDocument();
        expect(screen.getByText('Relever')).toBeInTheDocument();
        expect(screen.queryByText('Valider')).not.toBeInTheDocument();
        // Difficulty badge
        expect(screen.getByText('Facile')).toBeInTheDocument();
    });

    it('should render active challenge state correctly', () => {
        renderCard({ activeChallenge: mockActiveChallenge });

        expect(screen.getByText('Pompes Débutant')).toBeInTheDocument();
        // Should show "Valider" (or target reps)
        expect(screen.getByText('Valider')).toBeInTheDocument();
        expect(screen.getByText('Aujourd\'hui')).toBeInTheDocument();
    });

    it('should call onJoin when "Relever" is clicked', () => {
        const onJoin = vi.fn();
        renderCard({ template: mockTemplate, onJoin });

        const button = screen.getByText('Relever');
        fireEvent.click(button);

        expect(onJoin).toHaveBeenCalledWith(mockTemplate.id);
    });

    it('should handle validation logic', async () => {
        renderCard({ activeChallenge: { ...mockActiveChallenge, history: [] } });

        const validateBtn = screen.getByText('Valider');
        fireEvent.click(validateBtn);

        await waitFor(() => {
            expect(validateChallengeDay).toHaveBeenCalled();
        });
    });

    it('should show "Validé" if done today', () => {
        // Mock history has one entry (today)
        // Adjust startDate/history logic to simulate "Done Today"
        const doneChallenge = {
            ...mockActiveChallenge,
            history: [{ date: new Date(), reps: 10 }]
        };

        renderCard({ activeChallenge: doneChallenge });

        expect(screen.getByText('Validé')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Validé/i })).toBeDisabled();
    });

    it('should show "Rattrapage" if late', () => {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const lateChallenge = {
            ...mockActiveChallenge,
            startDate: { toDate: () => twoDaysAgo } as any,
            history: [] // Should have done Day 1 & 2
        };

        renderCard({ activeChallenge: lateChallenge });

        expect(screen.getByText(/Rattraper J1/)).toBeInTheDocument();
        expect(screen.getByText(/Retard: 2j/)).toBeInTheDocument();
    });
});
