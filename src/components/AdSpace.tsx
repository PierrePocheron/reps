import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { useEffect } from 'react';

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

    useEffect(() => {
        // Initialisation du slot AdSense (Web uniquement)
        if (!isNative && slotId) {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {
                console.error("AdSense error:", e);
            }
        }
    }, [isNative, slotId]);

    // WEB: AdSense
    if (!isNative) {
        if (!slotId) return null; // Si aucun ID défini, on n'affiche rien (UX propre)

        return (
            <div className={`text-center my-4 overflow-hidden ${className}`}>
                <ins className="adsbygoogle"
                     style={{ display: 'block' }}
                     data-ad-client="ca-pub-1431137074985627"
                     data-ad-slot={slotId}
                     data-ad-format="auto"
                     data-full-width-responsive="true"></ins>
            </div>
        );
    }

    // MOBILE: AdMob
    if (isNative) {
        // Si aucun ID Mobile défini, on n'affiche rien
        if (!adId) return null;

        return (
            <div className={`w-full min-h-[60px] bg-muted/10 border border-muted/20 flex flex-col items-center justify-center p-2 rounded-xl gap-1 my-4 ${className}`}>
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Publicité
                </span>
                 <p className="text-[10px] text-muted-foreground/40 text-center truncate px-4">
                     {adId}
                </p>
            </div>
        );
    }

    return null;
}

// Fonction utilitaire pour initialiser AdMob au lancement de l'app
export async function initializeAdMob() {
    if (Capacitor.isNativePlatform()) {
        try {
            await AdMob.initialize({
                testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // Exemple ID
                initializeForTesting: true,
            });
            console.log('AdMob initialized');
        } catch (e) {
            console.error('Failed to initialize AdMob', e);
        }
    }
}
