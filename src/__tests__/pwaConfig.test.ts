import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import type { VitePWAOptions } from 'vite-plugin-pwa';

// Captures the options vite.config.ts hands to the PWA plugin
const pwa = vi.hoisted(() => ({ options: {} as Partial<VitePWAOptions> }));
vi.mock('vite-plugin-pwa', () => ({
  VitePWA: (options: Partial<VitePWAOptions>) => { pwa.options = options; return []; },
}));
// The real ones load esbuild, which does not run under jsdom
vi.mock('vite', () => ({ defineConfig: (config: unknown) => config }));
vi.mock('@vitejs/plugin-react', () => ({ default: () => [] }));
// Path in a variable: vite.config.ts belongs to tsconfig.node.json, not to the app's type-check
const viteConfig = '../../vite.config';
await import(/* @vite-ignore */ viteConfig);

describe('PWA config', () => {
  it('injects no registration script: it ran in the Android app too (src/utils/serviceWorker.ts registers on the web)', () => {
    expect(pwa.options.injectRegister).toBeNull();
  });

  it('never caches Firestore or Firebase answers (account data stayed in Cache Storage after sign-out and deletion)', () => {
    const urls = ['https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?gsessionid=x&SID=y&RID=rpc',
      'https://firebase.googleapis.com/v1alpha/projects/-/apps/x/webConfig'];
    const routes = pwa.options.workbox?.runtimeCaching ?? [];
    for (const url of urls) expect(routes.filter((r) => r.urlPattern instanceof RegExp && r.urlPattern.test(url))).toEqual([]);
  });

  it('keeps the sound effects once played, so a session validated offline still makes its sound', () => {
    const url = 'https://pedro-reps.web.app/sounds/success.mp3';
    const route = pwa.options.workbox?.runtimeCaching?.find((r) => r.urlPattern instanceof RegExp && r.urlPattern.test(url));
    expect(route?.handler).toBe('CacheFirst');
  });

  it('fetches the whole sound file: <audio> asks for a range, and a 206 answer cannot be cached', async () => {
    const url = 'https://pedro-reps.web.app/sounds/success.mp3';
    const route = pwa.options.workbox?.runtimeCaching?.find((r) => r.urlPattern instanceof RegExp && r.urlPattern.test(url));
    const willFetch = route?.options?.plugins?.find((p) => p.requestWillFetch)?.requestWillFetch;
    const request = new Request(url, { headers: { Range: 'bytes=0-' } });
    const sent = await willFetch?.({ request, event: new Event('fetch') as never, state: {} });
    expect(sent?.url).toBe(url);
    expect(sent?.headers.has('Range')).toBe(false);
  });

  it('ships the sounds without tags: a 436 KB cover image sat ahead of a few KB of audio in each', () => {
    for (const name of ['success', 'complete', 'tap']) {
      const file = readFileSync(`public/sounds/${name}.mp3`); // vitest runs from the project root
      expect(file.subarray(0, 3).toString('latin1')).not.toBe('ID3');
    }
  });
});
