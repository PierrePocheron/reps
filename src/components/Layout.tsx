import { ReactNode, type CSSProperties } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { BottomNav } from '@/components/BottomNav';
import { AlertCircle } from 'lucide-react';
import { useAdStore } from '@/store/adStore';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout principal de l'application avec gestion du mode offline
 */
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Tutoriel chargé à la demande : il est vu une fois, et embarque framer-motion (hors du bundle initial)
const Onboarding = lazy(() => import('@/components/Onboarding').then((m) => ({ default: m.Onboarding })));
const onboardingDone = () => { try { return !!localStorage.getItem('reps_onboarding_v2'); } catch { return false; } };

// ... (imports)

export function Layout({ children }: LayoutProps) {
  const { isOffline } = useOffline();
  const { bannerHeight, reset } = useAdStore();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  // Nouvelle page = en haut (sinon « Refaire » sur une carte basse de l'historique ouvrait la séance au milieu) ;
  // pas au retour arrière, pour ne pas gêner une éventuelle restauration de position
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  // Widget d'écran d'accueil (#36) : un tap ouvre l'appli sur l'accueil
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const sub = App.addListener('appUrlOpen', ({ url }) => { if (url.endsWith('://home')) navigate('/'); });
    return () => { void sub.then((h) => h.remove()); };
  }, [navigate]);

  // Fail-safe: Si on est sur la home ('/'), on force le reset des pubs
  // au cas où le compteur serait désynchronisé
  useEffect(() => {
    if (location.pathname === '/') {
       reset();
    }
  }, [location.pathname, reset]);

  return (
    <>
      {!onboardingDone() && <Suspense fallback={null}><Onboarding /></Suspense>}

      {/* Bannière offline */}
      {isOffline && (
        // Opaque and single-line: its height is reserved below (--offline-h), content no longer shows through
        <div role="status" className="bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-500/30 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] fixed top-0 left-0 right-0 z-[60]">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300 max-w-2xl mx-auto whitespace-nowrap">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Hors ligne — tout est enregistré<span className="max-[479px]:hidden">, envoi au retour du réseau</span></span>
          </div>
        </div>
      )}

      {/* Contenu principal avec padding dynamique pour la pub */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          // sticky page headers add it to their offset so they stop below the offline banner
          '--offline-h': isOffline ? '2.3125rem' : '0px',
          paddingTop: 'calc(env(safe-area-inset-top) + var(--offline-h))',
          paddingBottom: bannerHeight > 0 ? `${bannerHeight}px` : undefined,
        } as CSSProperties}
      >
        {children}
      </main>

      {/* Barre de navigation flottante (pilule), remontée si pub active ; seule la pilule capte les touchers */}
      <div
        className="fixed inset-x-0 z-50 pointer-events-none transition-all duration-300"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + 0.75rem + ${bannerHeight}px)` }}
      >
        <BottomNav />
      </div>
    </>
  );
}

