import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { requestFCMToken, saveFCMToken, disableFCMNotifications, onForegroundMessage } from '@/firebase/fcm';
import { useUserStore } from '@/store/userStore';
import { scheduleNativeReminder } from '@/utils/dailyReminder';

const isNative = Capacitor.isNativePlatform();

export const useNotifications = () => {
  const { toast } = useToast();
  const { user } = useUserStore();
  const [hasPermission, setHasPermission] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (isNative) {
      checkNativePermission();
      checkNativeScheduled();
    } else {
      // no Notification API in a plain iOS Safari tab or in-app browsers: reading it threw and took Réglages down
      setHasPermission(typeof Notification !== 'undefined' && Notification.permission === 'granted');
    }
  }, []);

  // Écoute les messages FCM en foreground (web uniquement)
  useEffect(() => {
    if (isNative) return;
    const unsub = onForegroundMessage(({ title, body }) => {
      toast({ title: title || '💪 Reps', description: body });
    });
    return unsub;
  }, [toast]);

  // ─── Native (Capacitor) helpers ───────────────────────────────────────

  const checkNativePermission = async () => {
    try {
      const status = await LocalNotifications.checkPermissions();
      setHasPermission(status.display === 'granted');
    } catch (err) {
      logger.error('Erreur vérification permissions notif:', err);
    }
  };

  const checkNativeScheduled = async () => {
    try {
      const pending = await LocalNotifications.getPending();
      setIsScheduled(pending.notifications.some((n) => n.id === 1));
    } catch (err) {
      logger.error('Erreur vérification notifs planifiées:', err);
    }
  };

  const requestNativePermission = async (): Promise<boolean> => {
    try {
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (err) {
      logger.error('Erreur demande permission notif:', err);
      return false;
    }
  };

  // ─── scheduleDailyReminder ────────────────────────────────────────────

  const scheduleDailyReminder = useCallback(async (timeStr: string = '20:00') => {
    if (isNative) {
      // Capacitor — notification locale planifiée
      let granted = hasPermission;
      if (!granted) {
        granted = await requestNativePermission();
        if (!granted) {
          toast({
            title: 'Notifications désactivées',
            description: 'Active les notifications dans les réglages de ton appareil.',
            variant: 'destructive',
          });
          return false;
        }
      }

      try {
        await scheduleNativeReminder(timeStr);

        setIsScheduled(true);
        toast({ title: 'Rappel activé !', description: `Notification chaque jour à ${timeStr}.` });
        return true;
      } catch (err) {
        logger.error('Erreur planification notif:', err);
        toast({ title: 'Erreur', description: 'Impossible de programmer le rappel.', variant: 'destructive' });
        return false;
      }
    } else {
      // Web — FCM push
      if (!('Notification' in window)) {
        toast({ title: 'Non supporté', description: 'Ton navigateur ne gère pas les notifications.', variant: 'destructive' });
        return false;
      }

      const token = await requestFCMToken();
      if (!token) {
        toast({
          title: 'Notifications refusées',
          description: 'Autorise les notifications dans ton navigateur.',
          variant: 'destructive',
        });
        return false;
      }

      setFcmToken(token);
      setHasPermission(true);
      setIsScheduled(true);

      if (user?.uid) {
        await saveFCMToken(user.uid, token, timeStr);
      }

      toast({
        title: 'Notifications activées !',
        description: `Rappel quotidien configuré à ${timeStr}.`,
      });
      return true;
    }
  }, [hasPermission, toast, user?.uid]);

  // ─── cancelReminder ───────────────────────────────────────────────────

  const cancelReminder = useCallback(async () => {
    if (isNative) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        setIsScheduled(false);
        toast({ title: 'Rappel désactivé', description: 'Tu ne recevras plus de rappel quotidien.' });
      } catch (err) {
        logger.error('Erreur annulation notif:', err);
      }
    } else {
      setIsScheduled(false);
      setFcmToken(null);
      if (user?.uid) {
        await disableFCMNotifications(user.uid);
      }
      toast({ title: 'Notifications désactivées', description: 'Tu ne recevras plus de rappel.' });
    }
  }, [toast, user?.uid]);

  return {
    hasPermission,
    isScheduled,
    fcmToken,
    isNative,
    requestPermission: isNative ? requestNativePermission : async () => {
      const token = await requestFCMToken();
      const granted = !!token;
      setHasPermission(granted);
      return granted;
    },
    scheduleDailyReminder,
    cancelReminder,
  };
};
