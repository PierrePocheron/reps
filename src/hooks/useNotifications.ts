import { LocalNotifications } from '@capacitor/local-notifications';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useNotifications = () => {
  const { toast } = useToast();
  const [hasPermission, setHasPermission] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);

  // Check permission status on mount
  useEffect(() => {
    checkPermission();
    checkScheduled();
  }, []);

  const checkPermission = async () => {
    try {
      const status = await LocalNotifications.checkPermissions();
      setHasPermission(status.display === 'granted');
    } catch (error) {
      console.error('Error checking notification permissions:', error);
    }
  };

  const checkScheduled = async () => {
    try {
      const pending = await LocalNotifications.getPending();
      // On vérifie si on a déjà une notif avec l'ID 1 (notre rappel quotidien)
      const hasReminder = pending.notifications.some(n => n.id === 1);
      setIsScheduled(hasReminder);
    } catch (error) {
      console.error('Error checking scheduled notifications:', error);
    }
  };

  const requestPermission = async () => {
    try {
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  };

  const scheduleDailyReminder = async (timeStr: string = "20:00") => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        toast({
          title: "Notifications désactivées",
          description: "Activez les notifications pour recevoir le rappel.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const [hours = 20, minutes = 0] = timeStr.split(':').map(Number);

      // Annuler l'existant pour éviter les doublons
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

      // Programmer
      const now = new Date();
      const scheduleTime = new Date();
      scheduleTime.setHours(hours, minutes, 0, 0);

      // Si l'heure est déjà passée aujourd'hui, on programme pour demain
      if (now > scheduleTime) {
        scheduleTime.setDate(scheduleTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            title: "💪 C'est l'heure des Reps !",
            body: "Avez-vous pensé à faire quelques reps aujourd'hui ? Chaque rep compte !",
            id: 1, // ID fixe
            schedule: {
              at: scheduleTime,
              every: 'day',
              allowWhileIdle: true
            },
            sound: undefined,
            attachments: undefined,
            actionTypeId: "",
            extra: null
          }
        ]
      });

      setIsScheduled(true);
      toast({
        title: "Rappel activé !",
        description: `Vous recevrez une notification chaque jour à ${timeStr}.`,
      });

    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de programmer le rappel.",
        variant: "destructive"
      });
    }
  };

  const cancelReminder = async () => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      setIsScheduled(false);
      toast({
        title: "Rappel désactivé",
        description: "Vous ne recevrez plus de rappel quotidien.",
      });
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  };

  return {
    hasPermission,
    isScheduled,
    requestPermission,
    scheduleDailyReminder,
    cancelReminder
  };
};
