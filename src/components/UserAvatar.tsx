import { cn } from '@/utils/cn';
import { User } from '@/firebase/types';

interface UserAvatarProps {
  user?: Partial<User> | null;
  emoji?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({ user, emoji, size = 'md', className }: UserAvatarProps) {
  // Déterminer l'emoji à afficher
  // 1. Prop emoji directe
  // 2. User avatarEmoji
  // 3. Fallback Poussin 🐥
  const displayEmoji = emoji || user?.avatarEmoji || '🐥';

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
    xl: 'w-16 h-16 text-3xl',
  };

  return (
    <div
      className={cn(
        'rounded-full bg-muted flex items-center justify-center border border-background shadow-sm overflow-hidden select-none',
        sizeClasses[size],
        className
      )}
    >
      <span className="leading-none flex items-center justify-center h-full w-full pb-[10%]">
        {displayEmoji}
      </span>
    </div>
  );
}
