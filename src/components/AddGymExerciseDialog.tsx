import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EXERCISE_CATEGORIES, MUSCULATION_EXERCISES } from '@/utils/constants';
import { Search, Check, ChevronRight, Loader2 } from 'lucide-react';
import type { ExerciseCategory, Exercise } from '@/firebase/types';
import { useHaptic } from '@/hooks/useHaptic';
import {
  loadExerciseLibrary,
  searchLibrary,
  toExercise,
  equipmentLabel,
  libraryImageUrl,
  LIBRARY_ID_PREFIX,
  type LibraryExercise,
} from '@/utils/exerciseLibrary';

/** Nombre max de lignes rendues en mode bibliothèque (performances) */
const LIBRARY_RENDER_LIMIT = 80;

interface AddGymExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (exercise: Exercise) => void;
  hasExercise: (exerciseId: string) => boolean;
  enrichedExercises?: Exercise[];
}

/** Vignette avec fallback emoji si le CDN est injoignable (offline) */
function ExerciseThumb({ src, alt, emoji }: { src: string | null; alt: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-xl">{emoji}</span>
      )}
    </div>
  );
}

export function AddGymExerciseDialog({
  open,
  onOpenChange,
  onAdd,
  hasExercise,
  enrichedExercises,
}: AddGymExerciseDialogProps) {
  const [source, setSource] = useState<'essentials' | 'library'>('essentials');
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [library, setLibrary] = useState<LibraryExercise[] | null>(null);
  const haptics = useHaptic();

  // Charger la bibliothèque au premier passage sur l'onglet
  useEffect(() => {
    if (source === 'library' && !library) {
      loadExerciseLibrary().then(setLibrary);
    }
  }, [source, library]);

  // Merge static exercises with enriched data (imageUrl locale)
  const exercises = MUSCULATION_EXERCISES.map((ex) => {
    const enriched = enrichedExercises?.find((e) => e.id === ex.id);
    return enriched ? { ...ex, imageUrl: enriched.imageUrl } : ex;
  });

  const filtered = exercises.filter((ex) => {
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const libraryResults = source === 'library' && library
    ? searchLibrary(library, search, selectedCategory)
    : [];

  const muscuCategories = EXERCISE_CATEGORIES.filter(
    (cat) =>
      cat.id === 'all' ||
      source === 'library' ||
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
      {/* h-[90vh] instead of max-h so height stays fixed when filter changes */}
      <DialogContent className="h-[90vh] flex flex-col p-0 gap-0 rounded-t-2xl sm:rounded-2xl">
        <div className="px-5 pt-5 pb-3 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-lg">Choisir un exercice</DialogTitle>
          </DialogHeader>
        </div>

        {/* Source : essentiels / bibliothèque complète */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex rounded-xl bg-muted p-1">
            {([
              ['essentials', 'Essentiels'],
              ['library', 'Bibliothèque'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => { haptics.selection(); setSource(key); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  source === key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recherche */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={source === 'library' ? 'Rechercher parmi 1324 exercices…' : 'Rechercher...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted border-0 focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Catégories — scrollable horizontal avec fade droite */}
        <div className="relative flex-shrink-0 pb-2">
          <div className="overflow-x-auto scrollbar-none pl-5 pr-5">
            <div className="flex gap-2 min-w-max">
              {muscuCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { haptics.selection(); setSelectedCategory(cat.id); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Fade droite pour indiquer le scroll */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent" />
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-5">
          {source === 'essentials' ? (
            filtered.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">
                Aucun exercice trouvé
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((exercise) => {
                  const added = hasExercise(exercise.id);
                  return (
                    <button
                      key={exercise.id}
                      disabled={added}
                      onClick={() => handleAdd(exercise)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                        added
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-muted active:bg-muted/80 active:scale-[0.99]'
                      }`}
                    >
                      <ExerciseThumb src={exercise.imageUrl ?? null} alt={exercise.name} emoji={exercise.emoji} />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{exercise.name}</p>
                        {exercise.category && (
                          <p className="text-xs text-muted-foreground">
                            {EXERCISE_CATEGORIES.find((c) => c.id === exercise.category)?.label}
                          </p>
                        )}
                      </div>

                      {added ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )
          ) : !library ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : libraryResults.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-10">
              Aucun exercice trouvé
            </p>
          ) : (
            <div className="space-y-1">
              {libraryResults.slice(0, LIBRARY_RENDER_LIMIT).map((libEx) => {
                const id = `${LIBRARY_ID_PREFIX}${libEx.id}`;
                const added = hasExercise(id);
                return (
                  <button
                    key={id}
                    disabled={added}
                    onClick={() => handleAdd(toExercise(libEx))}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                      added
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-muted active:bg-muted/80 active:scale-[0.99]'
                    }`}
                  >
                    <ExerciseThumb src={libraryImageUrl(libEx)} alt={libEx.name} emoji="💪" />

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{libEx.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {equipmentLabel(libEx.equipment)}
                        {' · '}
                        {EXERCISE_CATEGORIES.find((c) => c.id === libEx.category)?.label}
                      </p>
                    </div>

                    {added ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground flex-shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                );
              })}
              {libraryResults.length > LIBRARY_RENDER_LIMIT && (
                <p className="text-center text-xs text-muted-foreground py-3">
                  {libraryResults.length} résultats — affine ta recherche pour voir les autres
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
