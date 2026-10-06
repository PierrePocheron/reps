import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { subscribeToFriendRequests } from '@/firebase/firestore';
import { applyThemeColor } from '@/utils/theme-colors';
import { initializeAdMob } from '@/utils/admob';
import { initializeSocialLogin } from '@/utils/social-login';
import { useBadgeEvents } from '@/hooks/useBadgeEvents';
import { restoreDailyReminder } from '@/utils/dailyReminder';

/**
 * Composant d'initialisation de l'application
 * Initialise l'authentification, le thème et les paramètres au démarrage
 */
export function AppInitializer() {
  const { initializeAuth, user, setFriendRequests } = useUserStore();
  const { loadSettings, applyTheme } = useSettingsStore();

  // Souscrire aux événements de badges (Gamification)
  useBadgeEvents();

  // Once per app start. It used to share the theme effect below and re-ran on every sign-in, sign-out and theme
  // change: another auth listener each time, and the loading flag remounted the login form (typed credentials lost)
  useEffect(() => {
    initializeAuth();
    initializeAdMob(); // mobile
    initializeSocialLogin(); // mobile Google sign-in
    loadSettings(); // localStorage
    const { notificationsEnabled, notificationTime } = useSettingsStore.getState();
    void restoreDailyReminder(notificationsEnabled, notificationTime); // mobile: reminder lost by older versions
  }, [initializeAuth, loadSettings]);

  // Android back: with no listener, @capacitor/app only goes back in the WebView and swallows the press on the
  // first page; leave the app there, as Android does
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.minimizeApp();
    });
    return () => { void sub.then((h) => h.remove()); };
  }, []);

  // Theme: the profile's colour when signed in, otherwise the local setting
  useEffect(() => {
    if (user?.colorTheme) {
      applyThemeColor(user.colorTheme);
    } else {
      applyTheme();
    }
  }, [applyTheme, user?.colorTheme]);

  // Souscription aux demandes d'amis
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToFriendRequests(user.uid, (requests) => {
      // Filtrer les demandes provenant de personnes déjà amies
      const filteredRequests = requests.filter(req => !user.friends?.includes(req.fromUserId));
      setFriendRequests(filteredRequests);
    });

    return () => unsubscribe();
  }, [user, setFriendRequests]);

  // Ce composant ne rend rien
  return null;
}

