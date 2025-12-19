import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Plus } from 'lucide-react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { useSound } from '@/hooks/useSound';
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
  repButtons?: number[];
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
  repButtons = [5, 10], // Default values
}, ref) => {
  const { play } = useSound();
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
              {repButtons.map((value, index) => (
                <motion.button
                  key={value}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    try {
                      Haptics.impact({ style: ImpactStyle.Light });
                      play('success');
                    } catch (e) {
                      // Ignore errors
                    }
                    onAddReps(value);
                  }}
                  className={cn(
                    "rounded-2xl flex flex-col items-center justify-center transition-colors relative",
                    // Le dernier bouton est mis en avant (primaire), les autres sont secondaires
                    index === repButtons.length - 1
                      ? "h-14 w-16 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                      : "h-14 w-14 bg-primary/10 hover:bg-primary/20 text-primary"
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
