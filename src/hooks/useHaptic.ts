import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useCallback } from 'react';



export const useHaptic = () => {
  const impact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      // Fail silently on unsupported platforms
    }
  }, []);

  const notification = useCallback(async (type: NotificationType = NotificationType.Success) => {
    try {
      await Haptics.notification({ type });
    } catch (error) {
      // Fail silently
    }
  }, []);

  const vibrate = useCallback(async (duration: number = 200) => {
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      // Fail silently
    }
  }, []);

  const selection = useCallback(async () => {
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (error) {
      // Fail silently
    }
  }, []);

  return {
    impact,
    notification,
    vibrate,
    selection
  };
};
