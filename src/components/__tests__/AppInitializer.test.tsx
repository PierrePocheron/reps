import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { AppInitializer } from '../AppInitializer';
import { useUserStore } from '@/store/userStore';

vi.mock('@/utils/admob', () => ({ initializeAdMob: vi.fn() }));
vi.mock('@/utils/social-login', () => ({ initializeSocialLogin: vi.fn() }));
vi.mock('@/hooks/useBadgeEvents', () => ({ useBadgeEvents: vi.fn() }));

describe('AppInitializer', () => {
  it('initialises auth once, not again when the theme or the user changes', () => {
    const initializeAuth = vi.fn(async () => {});
    useUserStore.setState({ initializeAuth, user: null });
    render(<AppInitializer />);
    // sign-in / sign-out / theme picked in Réglages: re-running it flashed the loading screen and reset the login form
    act(() => useUserStore.setState({ user: { uid: 'u1', colorTheme: 'blue' } as never }));
    act(() => useUserStore.setState({ user: { uid: 'u1', colorTheme: 'green' } as never }));
    act(() => useUserStore.setState({ user: null }));
    expect(initializeAuth).toHaveBeenCalledTimes(1);
  });
});
