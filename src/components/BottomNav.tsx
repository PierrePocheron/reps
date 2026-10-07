import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Trophy, Dumbbell, BarChart2, Medal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SessionTypePicker } from '@/components/SessionTypePicker';

import { useUserStore } from '@/store/userStore';
import { useSession } from '@/hooks/useSession';
import { useGymSessionStore } from '@/store/gymSessionStore';

/**
 * Barre flottante en pilule (façon Instagram) : réduite quand on fait défiler vers le bas,
 * elle reprend sa taille en remontant, en la touchant ou en changeant de page.
 */
function useCompactOnScroll(pathname: string) {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return; // ignore les micro-défilements
      setCompact(y > last && y > 80); // descente au-delà du haut de page → réduite ; remontée → normale
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => setCompact(false), [pathname]);
  return [compact, setCompact] as const;
}

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { friendRequests, user } = useUserStore();
  const { isActive: sessionIsActive } = useSession();
  const gymPhase = useGymSessionStore((s) => s.phase); // phase only: other gym changes must not re-render the bar
  const hasActiveSession = sessionIsActive || gymPhase !== 'idle';
  const [showPicker, setShowPicker] = useState(false);
  const [compact, setCompact] = useCompactOnScroll(location.pathname);

  const item = (path: string, label: string, icon: ReactNode, badge?: ReactNode, badgeLabel?: string) => {
    const active = location.pathname === path;
    return (
      <button
        onClick={() => { if (!active) navigate(path); }} // the same page again only stacked history entries for back to pop
        aria-current={active ? 'page' : undefined}
        title={label}
        className="flex flex-1 h-full min-w-[44px] items-center justify-center"
      >
        <span className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-300 motion-reduce:transition-none',
          compact ? 'h-9 w-12' : 'h-11 w-14',
          active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'
        )}>
          <span className={cn('transition-transform duration-300 motion-reduce:transition-none', compact && 'scale-90')}>{icon}</span>
          {badge}
          <span className="sr-only">{badgeLabel ? `${label}, ${badgeLabel}` : label}</span>
        </span>
      </button>
    );
  };

  return (
    <>
      <nav
        aria-label="Navigation principale"
        onClick={() => compact && setCompact(false)} // toucher la barre réduite la redéploie
        className={cn(
          'pointer-events-auto mx-auto flex items-center justify-around rounded-full border border-border/60',
          'bg-background/75 dark:bg-card/80 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.18)]',
          'transition-all duration-300 ease-out motion-reduce:transition-none',
          compact ? 'h-12 w-[min(78vw,21rem)] px-1' : 'h-16 w-[min(92vw,26rem)] px-1.5'
        )}
      >
        {item('/', 'Accueil', <Home className="h-6 w-6" />, user?.newBadgeIds && user.newBadgeIds.length > 0 && (
          <span aria-hidden className="absolute top-1.5 right-3 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-background" />
        ), user?.newBadgeIds?.length ? 'nouveaux badges' : undefined)}
        {item('/statistics', 'Stats', <BarChart2 className="h-6 w-6" />)}

        {/* Bouton central — séance en cours → la reprendre, sinon choisir le type de séance */}
        <div className="flex flex-1 h-full items-center justify-center">
          <button
            onClick={() => {
              if (!hasActiveSession) return setShowPicker(true);
              const target = gymPhase !== 'idle' ? '/gym' : '/session';
              if (location.pathname !== target) navigate(target); // already there: no extra history entry (like the tabs)
            }}
            aria-label={hasActiveSession ? 'Reprendre la séance en cours' : 'Nouvelle séance'}
            className={cn(
              'relative flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md',
              'transition-all duration-300 active:scale-95 motion-reduce:transition-none',
              compact ? 'h-9 w-9' : 'h-12 w-12'
            )}
          >
            {hasActiveSession && <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />}
            <Dumbbell className={cn('relative z-10 transition-all duration-300', compact ? 'h-5 w-5' : 'h-6 w-6')} />
          </button>
        </div>

        {item('/friends', 'Social', <Users className="h-6 w-6" />, friendRequests.length > 0 && (
          <span aria-hidden className="absolute top-0.5 right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] leading-none font-bold text-white border border-background">
            {friendRequests.length > 9 ? '9+' : friendRequests.length}
          </span>
        ), friendRequests.length ? `${friendRequests.length} demande${friendRequests.length > 1 ? 's' : ''} d'ami` : undefined)}
        {item('/challenges', 'Défis', <Trophy className="h-6 w-6" />)}
        {item('/leaderboard', 'Top', <Medal className="h-6 w-6" />)}
      </nav>

      <SessionTypePicker open={showPicker} onClose={() => setShowPicker(false)} />
    </>
  );
}
