import { ReactNode } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { BottomNav } from '@/components/BottomNav';
import { AlertCircle } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout principal de l'application avec gestion du mode offline
 */
export function Layout({ children }: LayoutProps) {
  const { isOffline } = useOffline();

  return (
    <>
      {/* Bannière offline */}
      {isOffline && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <span>Mode hors ligne - Les données seront synchronisées à la reconnexion</span>
          </div>
        </div>
      )}
      <main className="pt-safe min-h-screen">
        {children}
      </main>
      <BottomNav />
    </>
  );
}

