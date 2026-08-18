import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DEFAULT_EXERCISES, EXERCISE_CATEGORIES } from '@/utils/constants';
import { Check, Search, Plus, ChevronRight, Loader2, X } from 'lucide-react';
import type { ExerciseCategory, Exercise } from '@/firebase/types';
import { useHaptic } from '@/hooks/useHaptic';
import { useExerciseImages } from '@/hooks/useExerciseImages';
import { useLanguage } from '@/hooks/useLanguage';
import { targetLabel } from '@/utils/exerciseLabels';
import {
  loadExerciseLibrary,
  searchLibrary,
  toExercise,
  libraryImageUrl,
  LIBRARY_ID_PREFIX,
  type LibraryExercise,
} from '@/utils/exerciseLibrary';

/** Nombre max de lignes rendues en mode bibliothèque (performances) */
const LIBRARY_RENDER_LIMIT = 80;

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

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDefault: (exerciseId: string) => void;
  onAddCustom: (name: string, emoji: string) => void;
  /** Ajout d'un exercice issu de la bibliothèque complète (poids du corps) */
  onAddLibrary?: (exercise: Exercise) => void;
  hasExercise: (name: string) => boolean;
}

export function AddExerciseDialog({
  open,
  onOpenChange,
  onAddDefault,
  onAddCustom,
  onAddLibrary,
  hasExercise,
}: AddExerciseDialogProps) {
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('💪');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<'essentials' | 'library'>('essentials');
  const [library, setLibrary] = useState<LibraryExercise[] | null>(null);
  const [libraryError, setLibraryError] = useState(false);
  const [libraryRetry, setLibraryRetry] = useState(0);
  const haptics = useHaptic();
  const { imageMap } = useExerciseImages();
  const lang = useLanguage();

  // Charger la bibliothèque (dans la langue courante) au premier passage sur l'onglet
  useEffect(() => {
    if (source !== 'library') return;
    let cancelled = false;
    setLibrary(null);
    setLibraryError(false);
    loadExerciseLibrary(lang)
      .then((lib) => { if (!cancelled) setLibrary(lib); })
      .catch(() => { if (!cancelled) setLibraryError(true); });
    return () => { cancelled = true; };
  }, [source, lang, libraryRetry]);

  // Bibliothèque : uniquement les exercices au poids du corps
  const libraryResults = source === 'library' && library
    ? searchLibrary(library, search, selectedCategory, 'body weight', lang)
    : [];

  const handleAddLibrary = (libEx: LibraryExercise) => {
    const exercise = toExercise(libEx, 'renforcement');
    if (!hasExercise(exercise.name) && onAddLibrary) {
      haptics.selection();
      onAddLibrary(exercise);
      onOpenChange(false);
    }
  };

  const handleAddDefault = (exerciseId: string) => {
    const exercise = DEFAULT_EXERCISES.find((ex) => ex.id === exerciseId);
    if (exercise && !hasExercise(exercise.name)) {
      haptics.selection();
      onAddDefault(exerciseId);
      onOpenChange(false);
    }
  };

  const duplicate = hasExercise(customName.trim());

  const handleAddCustom = () => {
    if (customName.trim() && customEmoji && !duplicate) {
      haptics.impact();
      onAddCustom(customName.trim(), customEmoji);
      setCustomName('');
      setCustomEmoji('💪');
      setShowCustomForm(false);
      onOpenChange(false);
    }
  };

  const filteredExercises = DEFAULT_EXERCISES.filter((ex) => {
    const matchesCategory = selectedCategory === 'all' || ex.category === selectedCategory;
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Only show categories that have exercises
  const visibleCategories = EXERCISE_CATEGORIES.filter(
    (cat) => cat.id === 'all' || source === 'library' || DEFAULT_EXERCISES.some((ex) => ex.category === cat.id)
  );

  const commonEmojis = ['💪', '🏋️', '🦵', '🤸', '🔥', '⚡', '💥', '🚀', '🏃', '🧘'];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setShowCustomForm(false); }}>
      <DialogContent className="h-[90vh] flex flex-col p-0 gap-0 border-0 rounded-t-3xl rounded-b-none top-auto bottom-0 translate-y-0 pb-safe sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%] sm:rounded-2xl sm:border">

        {!showCustomForm ? (
          <>
            <div className="px-5 pt-5 pb-3 flex-shrink-0">
              <DialogHeader>
                <DialogTitle className="text-lg">Choisir un exercice</DialogTitle>
              </DialogHeader>
            </div>

            {/* Source : essentiels / bibliothèque complète (poids du corps) */}
            {onAddLibrary && (
              <div className="px-5 pb-3 flex-shrink-0">
                <div className="flex rounded-xl bg-muted p-1">
                  {([
                    ['essentials', 'Essentiels'],
                    ['library', 'Bibliothèque'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { haptics.selection(); setSource(key); }}
                      aria-pressed={source === key}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.98] ${
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
            )}

            {/* Recherche */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={source === 'library' ? 'Rechercher dans la bibliothèque…' : 'Rechercher…'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  enterKeyHint="search"
                  className="pl-9 pr-10 h-10 bg-muted border-0 focus-visible:ring-1"
                  autoFocus={false}
                />
                {search && (
                  <button type="button" aria-label="Effacer la recherche" onClick={() => setSearch('')} className="absolute right-1 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Catégories — scrollable horizontal avec fade droite */}
            <div className="relative flex-shrink-0 pb-2">
              <div className="overflow-x-auto scrollbar-none pl-5 pr-5">
                <div className="flex gap-2 min-w-max">
                  {visibleCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { haptics.selection(); setSelectedCategory(cat.id); }}
                      aria-pressed={selectedCategory === cat.id}
                      className={`flex items-center gap-1.5 px-3 py-2 active:scale-95 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
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
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-2">
              {source === 'library' ? (
                libraryError ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-muted-foreground">Impossible de charger la bibliothèque. Vérifie ta connexion.</p>
                    <Button variant="outline" size="sm" onClick={() => setLibraryRetry((n) => n + 1)}>Réessayer</Button>
                  </div>
                ) : !library ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : libraryResults.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <p className="text-sm text-muted-foreground">{search ? <>Aucun résultat pour « {search} »</> : 'Aucun exercice dans cette catégorie'}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {(search || selectedCategory !== 'all') && (
                        <Button variant="outline" size="sm" onClick={() => { setSearch(''); setSelectedCategory('all'); }}>Réinitialiser</Button>
                      )}
                      <Button size="sm" onClick={() => setShowCustomForm(true)}>Créer un exercice personnalisé</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {libraryResults.slice(0, LIBRARY_RENDER_LIMIT).map((libEx) => {
                      const isAdded = hasExercise(libEx.name);
                      return (
                        <button
                          key={`${LIBRARY_ID_PREFIX}${libEx.id}`}
                          disabled={isAdded}
                          onClick={() => handleAddLibrary(libEx)}
                          className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                            isAdded
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-muted active:bg-muted/80 active:scale-[0.99]'
                          }`}
                        >
                          <ExerciseThumb src={libraryImageUrl(libEx)} alt={libEx.name} emoji="💪" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{libEx.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {targetLabel(libEx.target, lang)}
                            </p>
                          </div>
                          {isAdded ? (
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
                )
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <p className="text-sm text-muted-foreground">{search ? <>Aucun résultat pour « {search} »</> : 'Aucun exercice dans cette catégorie'}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(search || selectedCategory !== 'all') && (
                      <Button variant="outline" size="sm" onClick={() => { setSearch(''); setSelectedCategory('all'); }}>Réinitialiser</Button>
                    )}
                    {onAddLibrary && (
                      <Button size="sm" onClick={() => { haptics.selection(); setSource('library'); }}>Chercher dans la bibliothèque</Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredExercises.map((exercise) => {
                    const isAdded = hasExercise(exercise.name);
                    return (
                      <button
                        key={exercise.id}
                        disabled={isAdded}
                        onClick={() => handleAddDefault(exercise.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                          isAdded
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-muted active:bg-muted/80 active:scale-[0.99]'
                        }`}
                      >
                        <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                          {imageMap[exercise.id] ? (
                            <img
                              src={imageMap[exercise.id]}
                              alt={exercise.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">{exercise.emoji}</span>
                          )}
                        </div>
                        <span className="flex-1 font-medium text-sm">{exercise.name}</span>
                        {isAdded ? (
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
              )}
            </div>

            {/* Footer — exercice personnalisé */}
            <div className="px-5 py-3 border-t">
              <button
                onClick={() => setShowCustomForm(true)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted flex-shrink-0">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </span>
                <span className="font-medium text-sm">Créer un exercice personnalisé</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto flex-shrink-0" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="px-5 pt-5 pb-3">
              <DialogHeader>
                <DialogTitle className="text-lg">Nouvel exercice</DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-5 pb-6 space-y-5 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="customName" className="text-sm font-medium">Nom</Label>
                <Input
                  id="customName"
                  placeholder="Ex. : Planche"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-11"
                  autoFocus
                />
                {duplicate && <p className="text-xs text-destructive">Tu as déjà un exercice avec ce nom</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Emoji</Label>
                <div className="flex flex-wrap gap-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { haptics.selection(); setCustomEmoji(emoji); }}
                      className={`text-xl p-2.5 rounded-xl border-2 transition-all ${
                        customEmoji === emoji
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent bg-muted hover:border-border'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setShowCustomForm(false); setCustomName(''); setCustomEmoji('💪'); }}
                  className="flex-1 h-11"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleAddCustom}
                  disabled={!customName.trim() || duplicate}
                  className="flex-1 h-11"
                >
                  Ajouter
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
