import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { useEffect } from 'react';
import { ADS_CONFIG } from '@/config/ads';
import { useAdStore } from '@/store/adStore';

interface AdSpaceProps {
    className?: string;
    slotId?: string; // ID AdSense (Web)
    adId?: string;   // ID AdMob (Mobile)
}

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        adsbygoogle: any[];
    }
}

export function AdSpace({ className = "", slotId, adId }: AdSpaceProps) {
    const isNative = Capacitor.isNativePlatform();
    const isEnabled = ADS_CONFIG.ENABLED;

    const { showBanner, hideBanner } = useAdStore();

    useEffect(() => {
        // Initialisation du slot AdSense (Web uniquement)
        if (isEnabled && !isNative && slotId) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.error("AdSense error:", e);
            }
        }

        // Native AdMob Trigger
        if (isEnabled && isNative && adId) {
            showBanner(adId);
            return () => {
                hideBanner();
            };
        }

        // Explicit return for consistency
        return undefined;
    }, [isNative, slotId, isEnabled, adId, showBanner, hideBanner]);

    // Si les pubs sont désactivées globalement, on ne rend rien
    if (!isEnabled) return null;

    // WEB: AdSense
    if (!isNative) {
        if (!slotId) return null; // Si aucun ID défini, on n'affiche rien (UX propre)

        return (
            <div className={`text-center my-4 overflow-hidden ${className}`}>
                <ins className="adsbygoogle"
                     style={{ display: 'block' }}
                     data-ad-client={ADS_CONFIG.ADSENSE.CLIENT_ID}
                     data-ad-slot={slotId}
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
            </div>
        );
    }

    // MOBILE: AdMob
    if (isNative) {
        // Pour l'instant, sur mobile, on affiche un placeholder si l'ID est présent
        // L'implémentation "Banner" native se fait généralement via Sticky Banner global
        // Si vous voulez des pubs "in-feed", il faut une implémentation native avancée.

        // On garde le placeholder en mode DEV pour vérifier le placement
        if (import.meta.env.DEV && adId) {
             return (
                <div className={`w-full min-h-[60px] bg-muted/10 border border-muted/20 flex flex-col items-center justify-center p-2 rounded-xl gap-1 my-4 ${className}`}>
                     <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Publicité (Placeholder Dev)
                    </span>
                     <p className="text-[10px] text-muted-foreground/40 text-center truncate px-4">
                         {adId}
                    </p>
                </div>
            );
        }
    }

    return null;
}

// Fonction utilitaire pour initialiser AdMob au lancement de l'app
export async function initializeAdMob() {
    if (!ADS_CONFIG.ENABLED) return;

    if (Capacitor.isNativePlatform()) {
        try {
            await AdMob.initialize({
                testingDevices: [ADS_CONFIG.ADMOB.TEST_DEVICE_ID],
                initializeForTesting: true,
            });
            console.log('AdMob initialized');

            // Demander le tracking (ATT) sur iOS
            // const tracking = await AdMob.trackingAuthorizationStatus();
            // if (tracking.status === 'notDetermined') { ... }

        } catch (e) {
            console.error('Failed to initialize AdMob', e);
        }
    }
}
