import { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GymSessionExercise, PlannedSet } from '@/firebase/types';

interface GymExerciseCardProps {
  exercise: GymSessionExercise;
  onAddSet: (set: Omit<PlannedSet, 'completed'>) => void;
  onUpdateSet: (setIndex: number, partial: Partial<Omit<PlannedSet, 'completed'>>) => void;
  onRemoveSet: (setIndex: number) => void;
  onDuplicateLastSet: () => void;
  onRemoveExercise: () => void;
}

export function GymExerciseCard({
  exercise,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onDuplicateLastSet,
  onRemoveExercise,
}: GymExerciseCardProps) {
  const [newWeight, setNewWeight] = useState('');
  const [newReps, setNewReps] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const lastSet = exercise.sets[exercise.sets.length - 1];

  const handleAddSet = () => {
    const weight = parseFloat(newWeight);
    const reps = parseInt(newReps, 10);
    if (isNaN(weight) || isNaN(reps) || reps <= 0 || weight < 0) return;

    onAddSet({ weight, reps });
    setNewWeight('');
    setNewReps('');
    setShowAddForm(false);
  };

  const handleQuickDuplicate = () => {
    onDuplicateLastSet();
  };

  // Pré-remplir le formulaire avec les valeurs du dernier set
  const handleOpenAddForm = () => {
    if (lastSet) {
      setNewWeight(String(lastSet.actualWeight ?? lastSet.weight));
      setNewReps(String(lastSet.actualReps ?? lastSet.reps));
    }
    setShowAddForm(true);
  };

  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
      {/* Header exercice */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        {/* Image ou emoji */}
        <div className="h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
          {exercise.imageUrl ? (
            <img
              src={exercise.imageUrl}
              alt={exercise.name}
              className="h-full w-full object-cover"
            />
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

      {/* Liste des sets */}
      <div className="p-3 space-y-2">
        {exercise.sets.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">
            Aucune série — ajoutez-en une ci-dessous
          </p>
        )}

        {exercise.sets.map((set, i) => (
          <div
            key={i}
            className="flex items-center gap-2 bg-muted/30 rounded-xl px-3 py-2"
          >
            <span className="text-xs font-bold text-muted-foreground w-6 flex-shrink-0">
              S{i + 1}
            </span>

            {/* Reps */}
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

            {/* Poids */}
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

        {/* Formulaire ajout série */}
        {showAddForm ? (
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
            <span className="text-xs font-bold text-primary w-6 flex-shrink-0">
              S{exercise.sets.length + 1}
            </span>

            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                placeholder="10"
                value={newReps}
                onChange={(e) => setNewReps(e.target.value)}
                className="h-8 w-14 text-center text-sm p-1"
                min={1}
                autoFocus
              />
              <span className="text-xs text-muted-foreground">reps</span>
            </div>

            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                placeholder="60"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="h-8 w-16 text-center text-sm p-1"
                min={0}
                step={2.5}
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground text-xs"
              >
                ✕
              </button>
              <button
                onClick={handleAddSet}
                className="p-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenAddForm}
              className="flex-1 h-9 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter une série
            </Button>
            {exercise.sets.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleQuickDuplicate}
                className="h-9 px-3"
                title="Dupliquer la dernière série"
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
