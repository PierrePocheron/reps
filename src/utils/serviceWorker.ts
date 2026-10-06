import { Capacitor } from '@capacitor/core';

/**
 * Offline worker for the web app only (what vite-plugin-pwa's registerSW.js did). In the Android app the files are
 * already local, and the worker served the previous build on the first launch after each store update: remove the
 * one older versions installed.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (Capacitor.isNativePlatform()) {
    void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
    return;
  }
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js', { scope: '/' }), { once: true });
}
