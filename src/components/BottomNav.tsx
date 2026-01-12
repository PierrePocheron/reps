import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Trophy, Dumbbell, BarChart2 } from 'lucide-react';
import { cn } from '@/utils/cn';

import { useUserStore } from '@/store/userStore';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { friendRequests, user } = useUserStore();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-full border-t bg-background/80 backdrop-blur-lg pb-safe">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        <button
          onClick={() => navigate('/')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 transition-colors relative',
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
          className={cn(
            'flex flex-col items-center justify-center gap-1 transition-colors',
            isActive('/statistics') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart2 className="h-6 w-6" />
          <span className="text-[10px] font-medium">Stats</span>
        </button>

        <button
          onClick={() => navigate('/session')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 -mt-4 border-4 border-background"
        >
          <Dumbbell className="h-7 w-7" />
        </button>

        <button
          onClick={() => navigate('/friends')}
          className={cn(
            'relative flex flex-col items-center justify-center gap-1 transition-colors',
            isActive('/friends') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="relative">
            <Users className="h-6 w-6" />
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground animate-pulse border border-background">
                {friendRequests.length}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Social</span>
        </button>

        <button
          onClick={() => navigate('/challenges')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 transition-colors',
            isActive('/challenges') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Trophy className="h-6 w-6" />
          <span className="text-[10px] font-medium">Défis</span>
        </button>

        <button
          onClick={() => navigate('/leaderboard')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 transition-colors',
            isActive('/leaderboard') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart2 className="h-6 w-6" />
          <span className="text-[10px] font-medium">Top</span>
        </button>
      </div>
    </div>
  );
}
