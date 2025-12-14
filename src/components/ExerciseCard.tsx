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
  className?: string;
}

/**
 * Carte d'exercice avec compteur de reps et boutons d'action
 * Supporte le long press pour la suppression
 */
export function ExerciseCard({
  exercise,
  onAddReps,
  onRemove,
  isRemoving = false,
  onLongPress,
  className,
}: ExerciseCardProps) {
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
      animate={isRemoving ? { scale: 0.95, opacity: 0.5 } : { scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
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

          {/* Bouton supprimer (visible en mode suppression) */}
          {isRemoving && onRemove && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-2 right-2"
            >
              <Button
                variant="destructive"
                size="icon"
                onClick={onRemove}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

