import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { registerServiceWorker } from '../serviceWorker';

const unregister = vi.fn(async () => true);
const sw = {
  register: vi.fn(async () => ({})),
  getRegistrations: vi.fn(async () => [{ unregister }]),
};

describe('registerServiceWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  });
  afterEach(() => vi.restoreAllMocks());

  it('web: registers the offline worker once the page has loaded, as before', () => {
    registerServiceWorker();
    expect(sw.register).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    expect(sw.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('web: drops the Firestore answers older workers cached (account data left after sign-out and deletion)', async () => {
    const del = vi.fn(async () => true);
    vi.stubGlobal('caches', { keys: vi.fn(async () => []), delete: del });
    registerServiceWorker();
    await vi.waitFor(() => expect(del).toHaveBeenCalledTimes(2));
    expect(del).toHaveBeenCalledWith('firestore-cache');
    expect(del).toHaveBeenCalledWith('firebase-cache');
    window.dispatchEvent(new Event('load')); // the worker still registers
    expect(sw.register).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('Android app: no worker (it served the previous build after a store update), and the old one goes', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
    expect(sw.register).not.toHaveBeenCalled();
  });

  it('Android app: the old worker caches go too (they stayed on the device for ever)', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    const del = vi.fn(async () => true);
    vi.stubGlobal('caches', { keys: vi.fn(async () => ['workbox-precache-v2', 'exercise-photos']), delete: del });
    registerServiceWorker();
    await vi.waitFor(() => expect(del).toHaveBeenCalledTimes(2));
    expect(del).toHaveBeenCalledWith('exercise-photos');
    vi.unstubAllGlobals();
  });
});
