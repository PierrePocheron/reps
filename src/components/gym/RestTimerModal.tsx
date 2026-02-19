import { useEffect, useState, useRef } from 'react';
import { X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHaptic } from '@/hooks/useHaptic';
import { useSound } from '@/hooks/useSound';

interface RestTimerModalProps {
  open: boolean;
  durationSeconds: number;
  onDismiss: () => void;
  nextSetLabel?: string;
}

export function RestTimerModal({ open, durationSeconds, onDismiss, nextSetLabel }: RestTimerModalProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const haptics = useHaptic();
  const { play } = useSound();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer quand il s'ouvre
  useEffect(() => {
    if (!open) return;
    setRemaining(durationSeconds);
  }, [open, durationSeconds]);

  // Décompte
  useEffect(() => {
    if (!open) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          haptics.notification();
          play('complete');
          setTimeout(onDismiss, 300);
          return 0;
        }
        if (prev <= 4) haptics.selection(); // buzz les 3 dernières secondes
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, haptics, play, onDismiss]);

  if (!open) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const progress = ((durationSeconds - remaining) / durationSeconds) * 100;

  return (
    <>
      {/* Backdrop semi-opaque */}
      <div className="fixed inset-0 bg-black/70 z-50 animate-in fade-in" />

      {/* Modal centré */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-background rounded-3xl shadow-2xl p-8 animate-in zoom-in-90 duration-200">
          {/* Label */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
              Repos
            </p>
            {nextSetLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                Prochain : {nextSetLabel}
              </p>
            )}
          </div>

          {/* Timer circulaire */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative flex items-center justify-center">
              {/* SVG cercle de progression */}
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
                {/* Track */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-muted/30"
                />
                {/* Progress */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className="text-primary transition-all duration-1000"
                />
              </svg>

              {/* Temps */}
              <div className="absolute text-center">
                <span className="text-4xl font-black tabular-nums">
                  {minutes > 0
                    ? `${minutes}:${String(seconds).padStart(2, '0')}`
                    : String(remaining)
                  }
                </span>
                {minutes === 0 && (
                  <p className="text-xs text-muted-foreground">sec</p>
                )}
              </div>
            </div>

            {/* Boutons */}
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={onDismiss}
                className="flex-1"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Passer
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="h-10 w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
