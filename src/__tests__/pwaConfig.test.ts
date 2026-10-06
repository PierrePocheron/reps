import { describe, it, expect, vi } from 'vitest';
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
});
