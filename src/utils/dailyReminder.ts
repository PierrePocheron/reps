import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { logger } from '@/utils/logger';

const REMINDER_ID = 1;

/** Rappel d'entraînement quotidien sur l'appareil (natif). `on` se répète : le plugin le reprogramme après chaque envoi. */
export async function scheduleNativeReminder(timeStr: string): Promise<void> {
  const [hours = 20, minutes = 0] = timeStr.split(':').map(Number);
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  await LocalNotifications.schedule({
    notifications: [{
      title: "💪 C'est l'heure des Reps !",
      body: 'Chaque rep compte. Lance ta séance maintenant !',
      id: REMINDER_ID,
      // with `at`, `every` is ignored: the reminder used to fire once and never again
      schedule: { on: { hour: hours, minute: minutes }, allowWhileIdle: true },
    }],
  });
}

/**
 * Au lancement : remet le rappel que l'interrupteur dit actif mais que l'appareil n'a plus
 * (les versions précédentes ne le programmaient qu'une fois).
 */
export async function restoreDailyReminder(enabled: boolean, timeStr: string): Promise<void> {
  if (!enabled || !Capacitor.isNativePlatform()) return;
  try {
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return;
    const { notifications } = await LocalNotifications.getPending();
    if (!notifications.some((n) => n.id === REMINDER_ID)) await scheduleNativeReminder(timeStr);
  } catch (err) {
    logger.error('Rappel quotidien au lancement :', err);
  }
}
