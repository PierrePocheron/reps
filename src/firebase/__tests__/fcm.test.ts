import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config', () => ({ messaging: {}, db: {} }));
vi.mock('firebase/messaging', () => ({ getToken: vi.fn(async () => 'token-123'), onMessage: vi.fn() }));

describe('requestFCMToken', () => {
  const register = vi.fn(async () => ({ installing: null, waiting: null, active: { postMessage: vi.fn() } }));

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_FIREBASE_VAPID_KEY', 'vapid');
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
    Object.defineProperty(window, 'Notification', { configurable: true, value: { requestPermission: vi.fn(async () => 'granted') } });
    register.mockClear();
  });

  it('registers the messaging worker on its own scope, not the PWA one', async () => {
    const { requestFCMToken } = await import('../fcm');
    expect(await requestFCMToken()).toBe('token-123');
    // scope '/' replaced the offline (PWA) service worker, which then replaced this one on the next load
    expect(register).toHaveBeenCalledWith('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' });
  });
});
