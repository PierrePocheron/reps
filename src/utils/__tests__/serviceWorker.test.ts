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

  it('Android app: no worker (it served the previous build after a store update), and the old one goes', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
    expect(sw.register).not.toHaveBeenCalled();
  });
});
