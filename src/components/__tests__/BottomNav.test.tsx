import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from '../BottomNav';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

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
        const dot = container.querySelector('.bg-red-500.animate-pulse');
        expect(dot).toBeInTheDocument();
    });

    it('should show friend requests count', () => {
        useUserStore.setState({
            friendRequests: [{ id: 'req1' } as any, { id: 'req2' } as any]
        });

        renderNav();
        expect(screen.getByText('2')).toBeInTheDocument();
    });
});
