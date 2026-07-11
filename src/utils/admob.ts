import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { ADS_CONFIG } from '@/config/ads';
import { logger } from '@/utils/logger';

// Fonction utilitaire pour initialiser AdMob au lancement de l'app
export async function initializeAdMob() {
    // ENABLED_MOBILE doit aussi être vrai : sinon le SDK Mobile Ads ne doit
    // jamais s'initialiser sur mobile (conformité Play Store / Data Safety)
    if (!ADS_CONFIG.ENABLED || !ADS_CONFIG.ENABLED_MOBILE) return;

    if (Capacitor.isNativePlatform()) {
        try {
            await AdMob.initialize({
                testingDevices: [ADS_CONFIG.ADMOB.TEST_DEVICE_ID],
                initializeForTesting: import.meta.env.DEV,
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
