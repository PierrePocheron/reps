import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { GymSessionExercise, PlannedSet } from '@/firebase/types';

interface GymExerciseCardProps {
  exercise: GymSessionExercise;
  defaultSet?: { reps: number; weight: number }; // valeurs de l'historique si pas de set
  onAddSet: (set: Omit<PlannedSet, 'completed'>) => void;
  onUpdateSet: (setIndex: number, partial: Partial<Omit<PlannedSet, 'completed'>>) => void;
  onRemoveSet: (setIndex: number) => void;
  onRemoveExercise: () => void;
}

export function GymExerciseCard({
  exercise,
  defaultSet,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
}: GymExerciseCardProps) {
  const lastSet = exercise.sets[exercise.sets.length - 1];

  const handleAddSet = () => {
    const base = lastSet ?? defaultSet ?? { reps: 10, weight: 0 };
    onAddSet({ reps: base.reps, weight: base.weight });
  };

  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
          {exercise.imageUrl ? (
            <img src={exercise.imageUrl} alt={exercise.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">{exercise.emoji}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate">{exercise.name}</h3>
          <p className="text-xs text-muted-foreground">
            {exercise.sets.length} série{exercise.sets.length !== 1 ? 's' : ''} planifiée{exercise.sets.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={onRemoveExercise}
          className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Sets */}
      <div className="p-3 space-y-2">
        {exercise.sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-muted-foreground w-6 flex-shrink-0">S{i + 1}</span>

            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                value={set.reps}
                onChange={(e) => onUpdateSet(i, { reps: parseInt(e.target.value, 10) || 0 })}
                className="h-8 w-14 text-center text-sm p-1"
                min={1}
              />
              <span className="text-xs text-muted-foreground">reps</span>
            </div>

            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                value={set.weight}
                onChange={(e) => onUpdateSet(i, { weight: parseFloat(e.target.value) || 0 })}
                className="h-8 w-16 text-center text-sm p-1"
                min={0}
                step={2.5}
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>

            <button
              onClick={() => onRemoveSet(i)}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Bouton ajout rapide — toujours visible */}
        <button
          onClick={handleAddSet}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-xs font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Série {exercise.sets.length + 1}
        </button>
      </div>
    </div>
  );
}
