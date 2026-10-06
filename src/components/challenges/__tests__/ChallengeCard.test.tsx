import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChallengeCard } from '../ChallengeCard';
import { BrowserRouter } from 'react-router-dom';
import { validateChallengeDay, abandonChallenge } from '@/firebase/challenges';

// Mocks
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
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

    it('announces the step the server validated, not the one the stale card still shows', async () => {
        vi.mocked(validateChallengeDay).mockResolvedValue({ step: 1, reps: 12 } as never);
        renderCard({ activeChallenge: { ...mockActiveChallenge, history: [] } });

        fireEvent.click(screen.getByText('Valider'));

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Jour 2 validé !' }));
        });
    });

    it('shows why the validation failed (e.g. offline)', async () => {
        vi.mocked(validateChallengeDay).mockRejectedValue(new Error('Tu es hors ligne.'));
        renderCard({ activeChallenge: mockActiveChallenge });

        fireEvent.click(screen.getByText('Valider'));

        await waitFor(() => {
            expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Tu es hors ligne.', variant: 'destructive' }));
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
        expect(screen.getByText(/Retard\s*:\s*2\s*jours/)).toBeInTheDocument();
    });

    it('shows the step validated today, not the next one', () => {
        const { container } = renderCard({
            activeChallenge: { ...mockActiveChallenge, history: [{ date: new Date(), reps: 10 }], totalProgress: 10 }
        });

        expect(screen.getByText('J 1 / 30')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument(); // day 1 target, not day 2 (12)
        expect((container.querySelector('[style*="width"]') as HTMLElement).style.width).toBe(`${(1 / 30) * 100}%`);
    });

    it('counts the last step as late once the end date has passed', () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 35); // 30-day challenge
        const history = Array.from({ length: 29 }, () => ({ date: '2026-01-01', amount: 10, completed: true }));

        renderCard({ activeChallenge: { ...mockActiveChallenge, startDate: { toDate: () => new Date(startDate) }, history } });

        expect(screen.getByText(/Retard\s*:\s*1\s*jour$/)).toBeInTheDocument();
        expect(screen.getByText('Rattraper J30')).toBeInTheDocument();
    });

    it('validating the last step says the challenge is finished (the card just vanished)', async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 29);
        const history = Array.from({ length: 29 }, () => ({ date: '2026-01-01', amount: 10, completed: true }));
        vi.mocked(validateChallengeDay).mockResolvedValueOnce({ step: 29, reps: 68 });

        renderCard({ activeChallenge: { ...mockActiveChallenge, startDate: { toDate: () => new Date(startDate) }, history } });
        fireEvent.click(screen.getByRole('button', { name: 'Valider' }));

        await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Défi terminé\u00a0! 🏆' })));
    });

    it('writes reps in French (« 1 215 », no « 0 reps »)', () => {
        renderCard({ activeChallenge: { ...mockActiveChallenge, totalProgress: 1215 }, detailed: true });
        expect(screen.getByText(/^1\s215 reps faites$/)).toBeInTheDocument();
        expect(screen.getByText(/^sur 1\s170$/)).toBeInTheDocument();

        renderCard({ activeChallenge: mockActiveChallenge, detailed: true });
        expect(screen.getByText('0 rep faite')).toBeInTheDocument();

        renderCard({ template: { ...mockTemplate, durationDays: 45 } });
        expect(screen.getByText(/^Σ 2\s430$/)).toBeInTheDocument();
    });

    it('abandoning asks in the app and does not promise a challenge history', async () => {
        const confirm = vi.spyOn(window, 'confirm');
        renderCard({ activeChallenge: mockActiveChallenge, detailed: true });

        fireEvent.keyDown(screen.getByRole('button', { name: 'Options du défi' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: /Abandonner le défi/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Abandonner' }));

        await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: '«\u00a0Pompes Débutant\u00a0» abandonné' })));
        expect(confirm).not.toHaveBeenCalled();
        expect(JSON.stringify(toast.mock.calls)).not.toMatch(/déplacé/);
    });

    it('the abandon dialog waits for the write: no cancel or second tap halfway (offline it still abandoned)', async () => {
        let finish: () => void = () => {};
        vi.mocked(abandonChallenge).mockImplementationOnce(() => new Promise<void>((r) => { finish = r; }));
        renderCard({ activeChallenge: mockActiveChallenge, detailed: true });

        fireEvent.keyDown(screen.getByRole('button', { name: 'Options du défi' }), { key: 'Enter' });
        fireEvent.click(await screen.findByRole('menuitem', { name: /Abandonner le défi/ }));
        fireEvent.click(await screen.findByRole('button', { name: 'Abandonner' }));

        expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
        expect(screen.getByRole('button', { name: /Abandonner|Abandon en cours/ })).toBeDisabled();
        finish();
        await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
        expect(abandonChallenge).toHaveBeenCalledTimes(1);
    });

    it('a refused validation refreshes the card (it stayed stale after an abandon elsewhere)', async () => {
        const onUpdate = vi.fn();
        vi.mocked(validateChallengeDay).mockRejectedValueOnce(new Error("Ce défi n'est plus en cours."));
        renderCard({ activeChallenge: mockActiveChallenge, onUpdate });
        fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
        await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    });
});
