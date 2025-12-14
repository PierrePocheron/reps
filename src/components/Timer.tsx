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
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!isActive || !startTime) {
      setDuration(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, startTime]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className="h-5 w-5 text-muted-foreground" />
      <span className="text-2xl font-mono font-semibold">{formatTime(duration)}</span>
    </div>
  );
}

