import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Trophy, Dumbbell, BarChart2, Medal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SessionTypePicker } from '@/components/SessionTypePicker';

import { useUserStore } from '@/store/userStore';
import { useSession } from '@/hooks/useSession';
import { useGymSessionStore } from '@/store/gymSessionStore';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { friendRequests, user } = useUserStore();
  const { isActive: sessionIsActive } = useSession();
  const { phase: gymPhase } = useGymSessionStore();
  const hasActiveSession = sessionIsActive || gymPhase !== 'idle';
  const [showPicker, setShowPicker] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav aria-label="Navigation principale" className="w-full border-t bg-background/80 backdrop-blur-lg pb-safe">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          <button
            onClick={() => navigate('/')}
            aria-current={isActive('/') ? 'page' : undefined}
            className={cn(
              'flex flex-1 h-full min-w-[44px] flex-col items-center justify-center gap-1 transition-colors relative',
              isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <Home className="h-6 w-6" />
               {user?.newBadgeIds && user.newBadgeIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
              )}
            </div>
            <span className="text-[10px] font-medium">Accueil</span>
          </button>

          <button
            onClick={() => navigate('/statistics')}
            aria-current={isActive('/statistics') ? 'page' : undefined}
            className={cn(
              'flex flex-1 h-full min-w-[44px] flex-col items-center justify-center gap-1 transition-colors',
              isActive('/statistics') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BarChart2 className="h-6 w-6" />
            <span className="text-[10px] font-medium">Stats</span>
          </button>

          {/* Bouton central — session active → reprendre, sinon ouvre le picker */}
          <button
            onClick={() => hasActiveSession ? navigate(gymPhase !== 'idle' ? '/gym' : '/session') : setShowPicker(true)}
            aria-label={hasActiveSession ? 'Reprendre la séance en cours' : 'Nouvelle séance'}
            className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 -mt-4 border-4 border-background"
          >
            {hasActiveSession && (
              <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-40" />
            )}
            <Dumbbell className="h-7 w-7 relative z-10" />
          </button>

          <button
            onClick={() => navigate('/friends')}
            aria-current={isActive('/friends') ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 h-full min-w-[44px] flex-col items-center justify-center gap-1 transition-colors',
              isActive('/friends') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <div className="relative">
              <Users className="h-6 w-6" />
              {friendRequests.length > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[10px] leading-none font-bold text-primary-foreground animate-pulse border border-background">
                  {friendRequests.length > 9 ? '9+' : friendRequests.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Social</span>
          </button>

          <button
            onClick={() => navigate('/challenges')}
            aria-current={isActive('/challenges') ? 'page' : undefined}
            className={cn(
              'flex flex-1 h-full min-w-[44px] flex-col items-center justify-center gap-1 transition-colors',
              isActive('/challenges') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Trophy className="h-6 w-6" />
            <span className="text-[10px] font-medium">Défis</span>
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            aria-current={isActive('/leaderboard') ? 'page' : undefined}
            className={cn(
              'flex flex-1 h-full min-w-[44px] flex-col items-center justify-center gap-1 transition-colors',
              isActive('/leaderboard') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Medal className="h-6 w-6" />
            <span className="text-[10px] font-medium">Top</span>
          </button>
        </div>
      </nav>

      <SessionTypePicker open={showPicker} onClose={() => setShowPicker(false)} />
    </>
  );
}
