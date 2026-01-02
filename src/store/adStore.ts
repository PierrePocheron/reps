import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { ADS_CONFIG } from '@/config/ads';

// Store pour gérer l'état de la bannière AdMob (Mobile uniquement)
interface AdState {
  isBannerVisible: boolean;
  bannerHeight: number;
  activeRequests: number; // Compteur pour gérer les transitions entre pages
  showBanner: (adId?: string) => Promise<void>;
  hideBanner: () => Promise<void>;
}

export const useAdStore = create<AdState>((set, get) => ({
  isBannerVisible: false,
  bannerHeight: 0,
  activeRequests: 0,

  showBanner: async (adId) => {
    // Si ads désactivées ou non-natif, on ne fait rien
    if (!ADS_CONFIG.ENABLED || !Capacitor.isNativePlatform()) return;

    // Incrémenter le compteur de demandes
    const currentRequests = get().activeRequests;
    set({ activeRequests: currentRequests + 1 });

    // Si la bannière est DÉJÀ visible, on ne fait rien de plus (elle reste là)
    if (get().isBannerVisible) return;

    try {
        // ID par défaut (Test) ou Prod selon la plateforme
        const targetId = adId || (Capacitor.getPlatform() === 'ios'
            ? ADS_CONFIG.ADMOB.BANNER_ID_IOS
            : ADS_CONFIG.ADMOB.BANNER_ID_ANDROID);

        // Utiliser les IDs de TEST si on est en DEV ou si l'ID prod n'est pas fourni
        const finalId = import.meta.env.DEV
            ? (Capacitor.getPlatform() === 'ios' ? 'ca-app-pub-3940256099942544/2934735716' : 'ca-app-pub-3940256099942544/6300978111')
            : targetId;

        await AdMob.showBanner({
            adId: finalId,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
        });

        set({ isBannerVisible: true, bannerHeight: 60 });
    } catch (error) {
        console.error('Failed to show AdMob banner:', error);
        // En cas d'erreur, on reset pas forcément tout de suite pour éviter boucle,
        // mais on peut marquer comme invisible
        set({ isBannerVisible: false, bannerHeight: 0 });
    }
  },

  hideBanner: async () => {
    if (!Capacitor.isNativePlatform()) return;

    // Décrémenter le compteur
    const currentRequests = get().activeRequests;
    const newCount = Math.max(0, currentRequests - 1);
    set({ activeRequests: newCount });

    // Si il reste des demandes (ex: navigation page A -> B très rapide), on NE CACHE PAS
    if (newCount > 0) return;

    try {
        await AdMob.hideBanner();
        set({ isBannerVisible: false, bannerHeight: 0 });
    } catch (error) {
        console.error('Failed to hide AdMob banner:', error);
    }
  },
}));
