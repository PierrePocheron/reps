import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import type { SessionExercise } from '@/firebase/types';

interface ExerciseCardProps {
  exercise: SessionExercise;
  onAddReps: (reps: number) => void;
  onRemove?: () => void;
  isRemoving?: boolean;
  onLongPress?: () => void;
  onCancelRemove?: () => void;
  onConfirmRemove?: () => void;
  className?: string;
}

/**
 * Carte d'exercice avec compteur de reps et boutons d'action
 * Supporte le long press pour la suppression
 */
export const ExerciseCard = forwardRef<HTMLDivElement, ExerciseCardProps>(({
  exercise,
  onAddReps,
  // onRemove, // Removed unused prop to fix build error
  isRemoving = false,
  onLongPress,
  onCancelRemove,
  onConfirmRemove,
  className,
}, ref) => {
  let longPressTimer: NodeJS.Timeout | null = null;

  const handleTouchStart = () => {
    longPressTimer = setTimeout(() => {
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
          <div className="flex items-center justify-between">
            {/* Info exercice */}
            <div className="flex items-center gap-3 flex-1">
              <span className="text-3xl">{exercise.emoji}</span>
              <div>
                <h3 className="font-semibold text-lg">{exercise.name}</h3>
                <p className="text-2xl font-bold text-primary">{exercise.reps}</p>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddReps(5)}
                className="h-12 w-12 rounded-full p-0 relative"
              >
                <Plus className="h-5 w-5" />
                <span className="absolute -bottom-1 text-xs font-bold">+5</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddReps(10)}
                className="h-12 w-12 rounded-full p-0 relative"
              >
                <Plus className="h-5 w-5" />
                <span className="absolute -bottom-1 text-xs font-bold">+10</span>
              </Button>
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
