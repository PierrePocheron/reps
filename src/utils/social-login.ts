import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';
import { logger } from '@/utils/logger';

/**
 * Initialise le plugin SocialLogin avec la configuration Google
 */
export async function initializeSocialLogin(): Promise<void> {
  // Le plugin est uniquement nécessaire sur les plateformes natives
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await SocialLogin.initialize({
      google: {
        // iOS Client ID
        iOSClientId: '1074964811481-26v9jdrdk8l2pu3srjektdf3e2g9um2a.apps.googleusercontent.com',

        // Web Client ID (utilisé pour Android et iOS server)
        webClientId: '1074964811481-bfuf7migh96dkgtdlsf13l4bq6uqt223.apps.googleusercontent.com',

        // Server Client ID pour iOS (doit être identique au webClientId)
        iOSServerClientId: '1074964811481-bfuf7migh96dkgtdlsf13l4bq6uqt223.apps.googleusercontent.com',

        // Mode 'online' pour obtenir idToken (requis pour Firebase Auth)
        mode: 'online',
      },
    });

    logger.info('SocialLogin initialized successfully');
  } catch (error) {
    logger.error('Error initializing SocialLogin:', error);
    // Ne pas bloquer l'app si l'initialisation échoue
  }
}
