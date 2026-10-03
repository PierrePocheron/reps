import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { Auth, connectAuthEmulator } from 'firebase/auth';
import { Firestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';
import { logger } from '@/utils/logger';

/**
 * Configuration Firebase
 * Les variables d'environnement doivent être définies dans le fichier .env
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Vérification que toutes les variables sont définies
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

const missingVars = requiredEnvVars.filter((varName) => !import.meta.env[varName]);

if (missingVars.length > 0) {
  logger.warn(
    `⚠️ Variables d'environnement Firebase manquantes: ${missingVars.join(', ')}\n` +
      'Créez un fichier .env avec les valeurs Firebase. Voir ENV.md pour plus d\'informations.'
  );
}

// Initialisation Firebase (évite les doubles initialisations)
let app: FirebaseApp;
const existingApps = getApps();
if (existingApps.length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = existingApps[0]!;
}

// Initialisation des services Firebase
import {
  initializeAuth as initializeFirebaseAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';

// Configuration explicite de la persistance pour Capacitor
// Configuration explicite de la persistance pour Capacitor
import { getAuth } from 'firebase/auth';
let authInstance: Auth;
try {
  // Tente de récupérer l'instance existante (HMR safety)
  authInstance = getAuth(app);
} catch {
  // Si non initialisé, on initialise avec la conf
  authInstance = initializeFirebaseAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver, // Nécessaire pour signInWithPopup
  });
}
export const auth = authInstance;

// Configuration de Firestore avec cache local persistant (nouvelle API)
import { getFirestore } from 'firebase/firestore';
let dbInstance: Firestore;
try {
  dbInstance = getFirestore(app);
} catch {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
}
export const db = dbInstance;

// Mode démo : Auth + Firestore sur les émulateurs locaux (yarn dev:demo), jamais la prod
export const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true';
if (USE_EMULATORS) {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8085);
  } catch { /* déjà connecté (HMR) */ }
}

// Initialisation de Firebase Cloud Messaging (uniquement côté client)
export const messaging: Messaging | null = (() => {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !Capacitor.isNativePlatform() && !USE_EMULATORS) {
    try {
      return getMessaging(app);
    } catch (err) {
      logger.warn('Firebase Cloud Messaging non disponible', { error: err });
    }
  }
  return null;
})();

// Initialisation de App Check
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Clé ReCAPTCHA v3 : obligatoire via l'environnement — jamais de fallback
// sur la clé de test publique de Google (App Check serait décoratif).
// NB : sur l'app native (WebView), ReCAPTCHA v3 n'est pas fiable ; ne pas
// activer l'enforcement App Check côté console tant qu'un provider
// Play Integrity n'est pas en place pour Android.
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (typeof window !== 'undefined' && RECAPTCHA_SITE_KEY && !Capacitor.isNativePlatform() && !USE_EMULATORS) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    logger.warn('Erreur lors de l\'initialisation de App Check', { error: err });
  }
} else if (!RECAPTCHA_SITE_KEY) {
  logger.warn('VITE_RECAPTCHA_SITE_KEY absente : App Check non initialisé');
}

export default app;

