import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ExerciseImage } from '@/components/ExerciseImage';
import { Input, type InputProps } from '@/components/ui/input';
import type { GymSessionExercise, PlannedSet } from '@/firebase/types';
import { isTimed } from '@/utils/records';
import { decimalInput, parseDecimal } from '@/utils/formatters';
import { UnitToggle } from './UnitToggle';

const NUM_INPUT = 'text-center text-sm p-1';
const onFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

/** Number field written the French way (« 82,5 »): keeps what is being typed (« 82, ») and follows a value changed elsewhere. */
function DecimalInput({ value, onValue, ...props }: Omit<InputProps, 'value' | 'onChange' | 'type'> & { value: number; onValue: (n: number) => void }) {
  const [text, setText] = useState(() => decimalInput(value));
  return (
    <Input
      {...props}
      type="text"
      value={parseDecimal(text) === value ? text : decimalInput(value)}
      onChange={(e) => {
        const n = parseDecimal(e.target.value);
        if (n === null) return;
        setText(e.target.value);
        onValue(n);
      }}
    />
  );
}

interface GymExerciseCardProps {
  exercise: GymSessionExercise;
  defaultSet?: { reps: number; weight: number }; // valeurs de l'historique si pas de set
  onAddSet: (set: Omit<PlannedSet, 'completed'>) => void;
  onUpdateSet: (setIndex: number, partial: Partial<Omit<PlannedSet, 'completed'>>) => void;
  onRemoveSet: (setIndex: number) => void;
  onRemoveExercise: () => void;
  onToggleTimed?: () => void; // reps ⇄ secondes (#55)
}

export function GymExerciseCard({
  exercise,
  defaultSet,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onRemoveExercise,
  onToggleTimed,
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
          <ExerciseImage src={exercise.imageUrl} alt={exercise.name} emoji={exercise.emoji} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate">{exercise.name}</h3>
          <p className="text-xs text-muted-foreground">
            {exercise.sets.length} série{exercise.sets.length !== 1 ? 's' : ''} planifiée{exercise.sets.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={onRemoveExercise}
          aria-label={`Retirer ${exercise.name}`}
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive active:scale-95 transition-all flex-shrink-0"
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
              <DecimalInput
                inputMode="numeric"
                value={set.reps}
                onValue={(reps) => onUpdateSet(i, { reps })}
                onFocus={onFocusSelect}
                aria-label={`${isTimed(exercise) ? 'Durée visée en secondes' : 'Répétitions visées'}, série ${i + 1}`}
                className={`h-8 w-14 ${NUM_INPUT}`}
              />
              {onToggleTimed
                ? <UnitToggle timed={isTimed(exercise)} onToggle={onToggleTimed} />
                : <span className="text-xs text-muted-foreground">{isTimed(exercise) ? 's' : 'reps'}</span>}
            </div>

            <div className="flex items-center gap-1 flex-1">
              <DecimalInput
                inputMode="decimal"
                value={set.weight}
                onValue={(weight) => onUpdateSet(i, { weight })}
                onFocus={onFocusSelect}
                aria-label={`Charge en kg, série ${i + 1}`}
                className={`h-8 w-16 ${NUM_INPUT}`}
              />
              <span className="text-xs text-muted-foreground">kg</span>
            </div>

            <button
              onClick={() => onRemoveSet(i)}
              aria-label={`Supprimer la série ${i + 1}`}
              className="h-9 w-9 -my-1 -mr-1 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            >
              <Trash2 className="h-4 w-4" />
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
