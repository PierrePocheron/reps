import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Challenges from '../Challenges';
import { useUserStore } from '@/store/userStore';
import { joinChallenge } from '@/firebase/challenges';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useStreak', () => ({ useStreak: vi.fn() }));
vi.mock('@/hooks/useChallenges', () => ({
    useChallenges: () => ({ activeChallenges: [], isLoading: false, refreshChallenges: vi.fn() }),
}));
vi.mock('@/firebase/challenges', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/firebase/challenges')>()),
    joinChallenge: vi.fn(),
}));
vi.mock('@/components/challenges/CreateChallengeDialog', () => ({ CreateChallengeDialog: () => null }));
vi.mock('@/components/challenges/ChallengeCard', () => ({
    ChallengeCard: ({ template, onJoin, isJoining }: { template?: { id: string }; onJoin?: (id: string) => void; isJoining?: boolean }) =>
        template ? <button onClick={() => onJoin?.(template.id)} disabled={isJoining}>Relever</button> : null,
}));

describe('Challenges Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useUserStore.setState({ user: { uid: 'u1' } as any });
    });

    it('ignores a second « Relever » while a join is in flight (6 max)', () => {
        vi.mocked(joinChallenge).mockImplementation(() => new Promise(() => {})); // slow network
        render(<BrowserRouter><Challenges /></BrowserRouter>);

        // tap two different templates in quick succession
        screen.getAllByText('Relever').slice(0, 2).forEach((button) => fireEvent.click(button));

        expect(joinChallenge).toHaveBeenCalledTimes(1);
    });
});
