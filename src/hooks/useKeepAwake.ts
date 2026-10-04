import { useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/utils/logger';

// Android : drapeau natif FLAG_KEEP_SCREEN_ON (la Wake Lock API de la WebView ne relâche pas l'écran)
const KeepAwake = registerPlugin<{ set(options: { on: boolean }): Promise<void> }>('KeepAwake');

/** Garde l'écran allumé tant que `active` (séance en cours), sauf si le réglage est désactivé (#52). */
export function useKeepAwake(active: boolean) {
  const enabled = useSettingsStore((s) => s.keepAwake);

  useEffect(() => {
    if (!active || !enabled) return;
    if (Capacitor.getPlatform() === 'android') {
      KeepAwake.set({ on: true }).catch((err) => logger.error('Écran allumé :', err));
      return () => { KeepAwake.set({ on: false }).catch(() => { /* activité déjà détruite */ }); };
    }
    if (!('wakeLock' in navigator)) return;
    // Web : le navigateur relâche le verrou quand l'onglet est masqué → on le reprend au retour
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const acquire = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.wakeLock.request('screen')
        .then((l) => { if (done) void l.release(); else lock = l; })
        .catch(() => { /* refusé (économie d'énergie) : sans conséquence */ });
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      done = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release();
    };
  }, [active, enabled]);
}
