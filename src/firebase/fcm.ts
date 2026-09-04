import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, deleteField } from 'firebase/firestore';
import { messaging, db } from './config';
import { logger } from '@/utils/logger';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Enregistre le service worker FCM et transmet la config Firebase.
 */
async function registerFCMServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });

    // Transmet la config Firebase au SW (il ne peut pas lire import.meta.env)
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const sw = reg.installing || reg.waiting || reg.active;
    if (sw) {
      sw.postMessage({ type: 'FIREBASE_CONFIG', config });
    }

    return reg;
  } catch (err) {
    logger.error('Erreur enregistrement SW FCM:', err as Error);
    return null;
  }
}

/**
 * Demande la permission et retourne le token FCM.
 * Retourne null si la permission est refusée ou si FCM n'est pas disponible.
 */
export async function requestFCMToken(): Promise<string | null> {
  if (!messaging) {
    logger.warn('FCM non disponible (plateforme native ou SSR)');
    return null;
  }

  if (!VAPID_KEY) {
    logger.warn('VITE_FIREBASE_VAPID_KEY manquant — push web désactivé');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const swReg = await registerFCMServiceWorker();

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg ?? undefined,
    });

    return token || null;
  } catch (err) {
    logger.error('Erreur obtention token FCM:', err as Error);
    return null;
  }
}

/**
 * Sauvegarde le token FCM dans la sous-collection PRIVÉE de l'utilisateur
 * (users/{uid}/private/notifications, owner-only) : un token push ne doit
 * jamais être lisible par les autres comptes.
 */
export async function saveFCMToken(userId: string, token: string, reminderTime: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId, 'private', 'notifications'), {
      fcmToken: token,
      notificationTime: reminderTime,
      notificationsEnabled: true,
    }, { merge: true });
  } catch (err) {
    logger.error('Erreur sauvegarde token FCM:', err as Error);
    throw err;
  }
}

/**
 * Désactive les notifications push pour l'utilisateur.
 */
export async function disableFCMNotifications(userId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId, 'private', 'notifications'), {
      notificationsEnabled: false,
      fcmToken: deleteField(),
    }, { merge: true });
  } catch (err) {
    logger.error('Erreur désactivation notifications FCM:', err as Error);
  }
}

/**
 * Écoute les messages FCM en foreground.
 * Retourne une fonction de cleanup.
 */
export function onForegroundMessage(callback: (payload: { title?: string; body?: string }) => void): () => void {
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });

  return unsubscribe;
}
