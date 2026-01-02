import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useCallback } from 'react';



import { useSettingsStore } from '@/store/settingsStore';

export const useHaptic = () => {
  const { hapticFeedback } = useSettingsStore();

  const impact = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!hapticFeedback) return;
    try {
      await Haptics.impact({ style });
    } catch (error) {
      // Fail silently on unsupported platforms
    }
  }, [hapticFeedback]);

  const notification = useCallback(async (type: NotificationType = NotificationType.Success) => {
    if (!hapticFeedback) return;
    try {
      await Haptics.notification({ type });
    } catch (error) {
      // Fail silently
    }
  }, [hapticFeedback]);

  const vibrate = useCallback(async (duration: number = 200) => {
    if (!hapticFeedback) return;
    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      // Fail silently
    }
  }, [hapticFeedback]);

  const selection = useCallback(async () => {
    if (!hapticFeedback) return;
    try {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (error) {
      // Fail silently
    }
  }, [hapticFeedback]);

  return {
    impact,
    notification,
    vibrate,
    selection
  };
};
