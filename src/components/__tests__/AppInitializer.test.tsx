import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import { AppInitializer } from '../AppInitializer';
import { useUserStore } from '@/store/userStore';

vi.mock('@/utils/admob', () => ({ initializeAdMob: vi.fn() }));
vi.mock('@/utils/social-login', () => ({ initializeSocialLogin: vi.fn() }));
vi.mock('@/hooks/useBadgeEvents', () => ({ useBadgeEvents: vi.fn() }));
const capApp = vi.hoisted(() => ({
  backButton: null as null | ((e: { canGoBack: boolean }) => void),
  minimizeApp: vi.fn(),
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (event: string, fn: (e: { canGoBack: boolean }) => void) => {
      if (event === 'backButton') capApp.backButton = fn;
      return { remove: vi.fn() };
    }),
    minimizeApp: capApp.minimizeApp,
  },
}));

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

  it('Android back goes back in the app, and leaves it from the first page instead of doing nothing', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    useUserStore.setState({ initializeAuth: vi.fn(async () => {}), user: null });
    render(<AppInitializer />);

    capApp.backButton?.({ canGoBack: true });
    expect(back).toHaveBeenCalledTimes(1);
    expect(capApp.minimizeApp).not.toHaveBeenCalled();

    capApp.backButton?.({ canGoBack: false });
    expect(capApp.minimizeApp).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});
