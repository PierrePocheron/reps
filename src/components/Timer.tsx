import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TimerProps {
  startTime: number | null;
  isActive: boolean;
  className?: string;
}

/**
 * Composant Timer affichant la durée de la session
 * Met à jour automatiquement toutes les secondes
 */
export function Timer({ startTime, isActive, className }: TimerProps) {
  const [duration, setDuration] = useState(() =>
    isActive && startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
  );

  useEffect(() => {
    if (!isActive || !startTime) {
      setDuration(0);
      return;
    }

    const tick = () => setDuration(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    // never squeezed: at 320 px with a large font the header cut it (« 00:0 »); the clock icon goes first on small screens
    <div className={cn('flex shrink-0 items-center gap-2', className)}>
      <Clock className="hidden min-[360px]:block h-5 w-5 text-muted-foreground" aria-hidden />
      <span className="text-2xl font-mono font-semibold">{formatTime(duration)}</span>
    </div>
  );
}

