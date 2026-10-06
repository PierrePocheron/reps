import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { useSettingsStore } from '../settingsStore';

const statusBar = vi.hoisted(() => ({ setStyle: vi.fn(async (_options: { style: string }) => {}) }));
vi.mock('@capacitor/status-bar', () => ({ StatusBar: statusBar, Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' } }));

// Like a browser: every matchMedia() call returns a new object, the OS change reaches all of their listeners.
// Hoisted: the store applies the theme as soon as it is imported.
type Listener = (e: { matches: boolean }) => void;
const os = vi.hoisted(() => {
  const state = { dark: false, listeners: new Set<(e: { matches: boolean }) => void>() };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      media: query,
      get matches() { return state.dark; },
      addEventListener: (_: string, l: (e: { matches: boolean }) => void) => state.listeners.add(l),
      removeEventListener: (_: string, l: (e: { matches: boolean }) => void) => state.listeners.delete(l),
    }),
  });
  return state;
});
const listeners = os.listeners as Set<Listener>;
const osTurns = (dark: boolean) => { os.dark = dark; [...listeners].forEach((l) => l({ matches: dark })); };
const isDark = () => document.documentElement.classList.contains('dark');

describe('theme', () => {
  beforeEach(() => { osTurns(false); document.documentElement.classList.remove('dark'); });

  it('follows the OS in « Système »', () => {
    useSettingsStore.getState().setTheme('system');
    osTurns(true);
    expect(isDark()).toBe(true);
  });

  it('stays light once « Clair » is picked, even when the OS switches to dark at sunset', () => {
    useSettingsStore.getState().setTheme('system');
    useSettingsStore.getState().setTheme('light');
    osTurns(true);
    expect(isDark()).toBe(false);
  });

  it('keeps a single OS listener however often the theme is applied', () => {
    useSettingsStore.getState().setTheme('system');
    useSettingsStore.getState().applyTheme();
    useSettingsStore.getState().applyTheme();
    expect(listeners.size).toBe(1);
  });

  it('on Android, the status bar icons follow the app theme, not the phone one (unreadable when they differ)', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const lastStyle = () => statusBar.setStyle.mock.lastCall?.[0];

    useSettingsStore.getState().setTheme('dark'); // phone in light mode
    expect(lastStyle()).toEqual({ style: 'DARK' }); // light icons on the dark app
    useSettingsStore.getState().setTheme('light');
    expect(lastStyle()).toEqual({ style: 'LIGHT' });
    useSettingsStore.getState().setTheme('system');
    osTurns(true);
    expect(lastStyle()).toEqual({ style: 'DARK' });
    vi.restoreAllMocks();
  });
});
