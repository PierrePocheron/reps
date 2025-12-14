import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getMessaging, Messaging } from 'firebase/messaging';

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
  console.warn(
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
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Activation de la persistance offline (IndexedDB)
// Permet de travailler hors ligne et synchroniser automatiquement
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Plusieurs onglets ouverts, la persistance ne peut être activée que dans un seul
      console.warn('Firestore persistence déjà activée dans un autre onglet');
    } else if (err.code === 'unimplemented') {
      // Le navigateur ne supporte pas la persistance
      console.warn('Firestore persistence non supportée par ce navigateur');
    } else {
      console.error('Erreur lors de l\'activation de la persistance Firestore:', err);
    }
  });
}

// Initialisation de Firebase Cloud Messaging (uniquement côté client)
export let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn('Firebase Cloud Messaging non disponible:', err);
  }
}

export default app;

