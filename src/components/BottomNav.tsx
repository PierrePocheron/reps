import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, Users } from 'lucide-react';
import { cn } from '@/utils/cn';

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg pb-safe">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        <button
          onClick={() => navigate('/')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 transition-colors',
            isActive('/') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-medium">Accueil</span>
        </button>

        <button
          onClick={() => navigate('/session')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>

        <button
          onClick={() => navigate('/friends')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 transition-colors',
            isActive('/friends') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-6 w-6" />
          <span className="text-[10px] font-medium">Social</span>
        </button>
      </div>
    </div>
  );
}
