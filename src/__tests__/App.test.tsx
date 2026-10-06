import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import App from '../App';

vi.mock('@/components/AppInitializer', () => ({ AppInitializer: () => null }));
vi.mock('@/components/BottomNav', () => ({ BottomNav: () => null }));
vi.mock('@/utils/admob', () => ({ initializeAdMob: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'alice' }, isLoading: false }) }));
vi.mock('../pages/Home', () => ({ default: () => <p>accueil</p> }));

describe('App Smoke Test', () => {
    it('true should be true', () => {
        expect(true).toBe(true);
    });

    it('LoadingSpinner renders correctly', () => {
        render(<LoadingSpinner />);
        // Spinner usually has a class or some indicator.
        // Based on the code seen earlier, it's a lucide icon or a div.
        // We'll just check if it doesn't crash.
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });

    it('sends an unknown path (typo, old link) to Home instead of a blank page', async () => {
        localStorage.setItem('reps_onboarding_v2', '1');
        render(<MemoryRouter initialEntries={['/does-not-exist']}><App /></MemoryRouter>);
        expect(await screen.findByText('accueil')).toBeInTheDocument();
    });
});
