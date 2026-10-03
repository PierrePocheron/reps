import { forwardRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Undo2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useHaptic } from '@/hooks/useHaptic';
import { useSound } from '@/hooks/useSound';
import { cn } from '@/utils/cn';
import type { SessionExercise } from '@/firebase/types';

interface ExerciseCardProps {
  exercise: SessionExercise;
  onAddReps: (reps: number) => void;
  isRemoving?: boolean;
  onLongPress?: () => void;
  onCancelRemove?: () => void;
  onConfirmRemove?: () => void;
  className?: string;
  repButtons?: number[];
}

/**
 * Carte d'exercice avec compteur de reps et boutons d'action
 * Supporte le long press pour la suppression
 */
export const ExerciseCard = forwardRef<HTMLDivElement, ExerciseCardProps>(({
  exercise,
  onAddReps,
  isRemoving = false,
  onLongPress,
  onCancelRemove,
  onConfirmRemove,
  className,
  repButtons = [5, 10], // Default values
}, ref) => {
  const { play } = useSound();
  const haptics = useHaptic();
  // Dernier ajout annulable 5 s (un +20 par erreur se corrigeait impossible)
  const [lastAdded, setLastAdded] = useState<number | null>(null);
  useEffect(() => {
    if (lastAdded === null) return;
    const t = setTimeout(() => setLastAdded(null), 5000);
    return () => clearTimeout(t);
  }, [lastAdded, exercise.reps]);
  let longPressTimer: NodeJS.Timeout | null = null;

  const handleTouchStart = () => {
    longPressTimer = setTimeout(() => {
      haptics.impact();
      onLongPress?.();
    }, 500); // 500ms pour le long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={isRemoving ? { scale: 0.95, opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchEnd}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className="w-full"
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all',
          isRemoving && 'border-destructive border-2',
          className
        )}
      >
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Info exercice + Reps */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{exercise.emoji}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate pr-2">{exercise.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                <p className="text-3xl font-bold text-primary tabular-nums">{exercise.reps}</p>
                {lastAdded !== null ? (
                  <Button
                    variant="ghost"
                    className="h-11 min-w-11 px-2 gap-0.5 text-xs font-semibold text-muted-foreground"
                    aria-label={`Annuler l'ajout de ${lastAdded} répétitions`}
                    onClick={() => { onAddReps(-lastAdded); setLastAdded(null); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Undo2 className="h-4 w-4" />+{lastAdded}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label={`Supprimer ${exercise.name}`}
                    onClick={onLongPress}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {repButtons.map((value, index) => (
                <motion.button
                  key={value}
                  type="button"
                  aria-label={`Ajouter ${value} répétitions`}
                  whileTap={{ scale: 0.9 }}
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                      haptics.impact();
                      play('success');
                    onAddReps(value);
                    setLastAdded(value);
                  }}
                  className={cn(
                    "rounded-2xl flex flex-col items-center justify-center transition-colors relative flex-1 min-w-[3.5rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    // Le dernier bouton est mis en avant (primaire), les autres sont secondaires
                    index === repButtons.length - 1
                      ? "h-14 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                      : "h-14 bg-primary/10 hover:bg-primary/20 text-primary"
                  )}
                >
                  <Plus className="h-5 w-5 mb-0.5" />
                  <span className="text-xs font-bold leading-none">+{value}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Overlay suppression (visible en mode suppression) */}
          {isRemoving && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center gap-4 z-10"
            >
              <Button
                variant="outline"
                onClick={onCancelRemove}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={onConfirmRemove}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});

ExerciseCard.displayName = 'ExerciseCard';
