import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { useState } from 'react';

interface AdSpaceProps {
    className?: string;
    description?: string; // Pour le debugging
}

export function AdSpace({ className = "", description = "Publicité" }: AdSpaceProps) {
    const isNative = Capacitor.isNativePlatform();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [adLoaded, setAdLoaded] = useState(false);

    // Placeholder pour le développement / Web
    // En production Web, on remplacerait ça par le vrai script AdSense
    if (!isNative) {
        return (
            <div className={`w-full h-auto min-h-[100px] bg-muted/30 border-2 border-dashed border-muted flex flex-col items-center justify-center p-4 rounded-xl gap-2 my-4 ${className}`}>
                <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded uppercase tracking-wider">
                    Annonce • AdSense (Web)
                </span>
                <p className="text-xs text-muted-foreground/60 text-center max-w-[200px]">
                   {description}
                </p>
                <p className="text-[10px] text-muted-foreground/40 mt-1">
                    google_ad_client: "ca-pub-1431137074985627"
                </p>
            </div>
        );
    }

    // Version Mobile Native
    // Note: Pour une vraie intégration "inline" scrollable, c'est complexe avec Capacitor (les bannières sont souvent sticky).
    // Ici on affiche un placeholder "Support" pour lier vers AdMob plus tard ou test.
    return (
        <div className={`w-full min-h-[80px] bg-blue-500/5 border border-blue-500/20 flex flex-col items-center justify-center p-4 rounded-xl gap-1 my-4 ${className}`}>
             <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded uppercase tracking-wider">
                    Annonce • AdMob (Native)
            </span>
             <p className="text-xs text-blue-500/60 text-center">
                 {description}
            </p>
             <p className="text-[10px] text-muted-foreground/40 mt-1">
                 Banner ID (Test): ca-app-pub-3940256099942544/6300978111
             </p>
        </div>
    );
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
