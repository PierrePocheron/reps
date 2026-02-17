import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { ADS_CONFIG } from '@/config/ads';
import { logger } from '@/utils/logger';

// Fonction utilitaire pour initialiser AdMob au lancement de l'app
export async function initializeAdMob() {
    if (!ADS_CONFIG.ENABLED) return;

    if (Capacitor.isNativePlatform()) {
        try {
            await AdMob.initialize({
                testingDevices: [ADS_CONFIG.ADMOB.TEST_DEVICE_ID],
                initializeForTesting: true,
            });
            // AdMob initialized

            // Demander le tracking (ATT) sur iOS
            // const tracking = await AdMob.trackingAuthorizationStatus();
            // if (tracking.status === 'notDetermined') { ... }

        } catch (e) {
            logger.error('Failed to initialize AdMob', e);
        }
    }
}
