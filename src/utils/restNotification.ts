import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { logger } from '@/utils/logger';

const REST_ID = 2; // 1 = rappel quotidien (useNotifications)
let pendingAt: number | null = null;

/** Prévient de la fin du repos même app en arrière-plan / écran verrouillé (natif seulement). */
export async function scheduleRestEnd(at: number) {
  if (!Capacitor.isNativePlatform()) return;
  pendingAt = at;
  try {
    let { display } = await LocalNotifications.checkPermissions();
    if (display.startsWith('prompt')) ({ display } = await LocalNotifications.requestPermissions());
    // Repos arrêté ou relancé pendant la demande de permission : ne rien planifier
    if (display !== 'granted' || pendingAt !== at) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: REST_ID,
        title: 'Repos terminé ⏱️',
        body: 'À toi : série suivante !',
        schedule: { at: new Date(at), allowWhileIdle: true },
      }],
    });
  } catch (err) {
    logger.error('Notification de fin de repos :', err);
  }
}

/** Annule la notification en attente et la retire si elle est déjà affichée. */
export function cancelRestEnd() {
  if (!Capacitor.isNativePlatform()) return;
  pendingAt = null;
  LocalNotifications.cancel({ notifications: [{ id: REST_ID }] })
    .catch((err) => logger.error('Annulation de la notification de repos :', err));
}
