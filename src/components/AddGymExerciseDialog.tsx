import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EXERCISE_CATEGORIES, MUSCULATION_EXERCISES } from '@/utils/constants';
import { Search, Check } from 'lucide-react';
import type { ExerciseCategory, Exercise } from '@/firebase/types';
import { useHaptic } from '@/hooks/useHaptic';

interface AddGymExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (exercise: Exercise) => void;
  hasExercise: (exerciseId: string) => boolean;
  // Exercices enrichis depuis Firestore (avec imageUrl)
  enrichedExercises?: Exercise[];
}

export function AddGymExerciseDialog({
  open,
  onOpenChange,
  onAdd,
  hasExercise,
  enrichedExercises,
}: AddGymExerciseDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const haptics = useHaptic();

  // Fusionner les exercices statiques avec les données enrichies (imageUrl depuis Firestore)
  const exercises = MUSCULATION_EXERCISES.map((ex) => {
    const enriched = enrichedExercises?.find((e) => e.id === ex.id);
    return enriched ? { ...ex, imageUrl: enriched.imageUrl } : ex;
  });

  const filtered = exercises.filter((ex) => {
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtrer les catégories pour n'afficher que celles qui ont des exercices de musculation
  const muscuCategories = EXERCISE_CATEGORIES.filter(
    (cat) =>
      cat.id === 'all' ||
      MUSCULATION_EXERCISES.some((ex) => ex.category === cat.id)
  );

  const handleAdd = (exercise: Exercise) => {
    if (!hasExercise(exercise.id)) {
      haptics.selection();
      onAdd(exercise);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle>Ajouter un exercice</DialogTitle>
            <DialogDescription>
              Choisissez un exercice de musculation.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Barre de recherche */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Onglets catégories */}
        <div className="px-6 pb-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max">
            {muscuCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  haptics.selection();
                  setSelectedCategory(cat.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-transparent hover:border-border'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Liste des exercices */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">
              Aucun exercice trouvé
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((exercise) => {
                const added = hasExercise(exercise.id);
                return (
                  <button
                    key={exercise.id}
                    disabled={added}
                    onClick={() => handleAdd(exercise)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      added
                        ? 'border-primary/30 bg-primary/5 opacity-60 cursor-not-allowed'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50 active:scale-[0.98]'
                    }`}
                  >
                    {/* Image ou emoji */}
                    <div className="h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                      {exercise.imageUrl ? (
                        <img
                          src={exercise.imageUrl}
                          alt={exercise.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">{exercise.emoji}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{exercise.name}</p>
                      {exercise.category && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {EXERCISE_CATEGORIES.find((c) => c.id === exercise.category)?.label}
                        </p>
                      )}
                    </div>

                    {added && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
