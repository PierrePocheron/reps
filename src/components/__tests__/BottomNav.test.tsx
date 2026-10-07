import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Profiler } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BottomNav } from '../BottomNav';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { useGymSessionStore } from '@/store/gymSessionStore';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// The picker subscribes to the gym store on its own; stubbed so the render count below is the bar's alone
vi.mock('@/components/SessionTypePicker', () => ({ SessionTypePicker: () => null }));

describe('BottomNav Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useUserStore.setState({
            user: { newBadgeIds: [] } as any,
            friendRequests: []
        });
    });

    const renderNav = () => render(
        <BrowserRouter>
            <BottomNav />
        </BrowserRouter>
    );

    it('should render all navigation items', () => {
        renderNav();
        expect(screen.getByText('Accueil')).toBeInTheDocument();
        expect(screen.getByText('Stats')).toBeInTheDocument();
        expect(screen.getByText('Social')).toBeInTheDocument();
        expect(screen.getByText('Défis')).toBeInTheDocument();
        expect(screen.getByText('Top')).toBeInTheDocument();
    });

    it('should navigate when clicked', () => {
        renderNav();
        fireEvent.click(screen.getByText('Stats'));
        expect(mockNavigate).toHaveBeenCalledWith('/statistics');
    });

    it('does not stack history entries when the current tab is tapped again', () => {
        render(<MemoryRouter initialEntries={['/statistics']}><BottomNav /></MemoryRouter>);
        fireEvent.click(screen.getByText('Stats'));
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('the central button does not stack entries when the running session is already shown', () => {
        useGymSessionStore.setState({ phase: 'execute' } as never);
        render(<MemoryRouter initialEntries={['/gym']}><BottomNav /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: 'Reprendre la séance en cours' }));
        expect(mockNavigate).not.toHaveBeenCalled();
        useGymSessionStore.setState({ phase: 'idle' } as never);
    });

    it('does not re-render on gym store changes other than the phase', () => {
        let commits = 0;
        render(<Profiler id="nav" onRender={() => { commits++; }}><MemoryRouter><BottomNav /></MemoryRouter></Profiler>);
        const before = commits;
        act(() => { useGymSessionStore.setState({ restEndsAt: Date.now() + 60_000 }); });
        expect(commits).toBe(before);
        useGymSessionStore.setState({ restEndsAt: null });
    });

    it('should show notification dot for new badges on Home', () => {
        useUserStore.setState({
            user: { newBadgeIds: ['b1'] } as any
        });

        const { container } = renderNav();
        // Look for the red dot (animate-pulse)
        // Since it's a span without text, we query by class logic or role if added.
        // Or get parent (Home) and find span.
        // We can check if any element has 'bg-red-500'.

        // Note: Using container.querySelector is a bit fragile but valid for class checks on visual-only elements.
        // La pastille est annoncée aux lecteurs d'écran avec l'onglet
        expect(container.querySelector('[aria-hidden].bg-red-600')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Accueil, nouveaux badges' })).toBeInTheDocument();
    });

    it('should show friend requests count', () => {
        useUserStore.setState({
            friendRequests: [{ id: 'req1' } as any, { id: 'req2' } as any]
        });

        renderNav();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: "Social, 2 demandes d'ami" })).toBeInTheDocument();
    });
});
