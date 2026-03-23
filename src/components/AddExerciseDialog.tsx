import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DEFAULT_EXERCISES, EXERCISE_CATEGORIES } from '@/utils/constants';
import { Check, Search, Plus, ChevronRight } from 'lucide-react';
import type { ExerciseCategory } from '@/firebase/types';
import { useHaptic } from '@/hooks/useHaptic';

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDefault: (exerciseId: string) => void;
  onAddCustom: (name: string, emoji: string) => void;
  hasExercise: (name: string) => boolean;
}

export function AddExerciseDialog({
  open,
  onOpenChange,
  onAddDefault,
  onAddCustom,
  hasExercise,
}: AddExerciseDialogProps) {
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('💪');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const haptics = useHaptic();

  const handleAddDefault = (exerciseId: string) => {
    const exercise = DEFAULT_EXERCISES.find((ex) => ex.id === exerciseId);
    if (exercise && !hasExercise(exercise.name)) {
      haptics.selection();
      onAddDefault(exerciseId);
      onOpenChange(false);
    }
  };

  const handleAddCustom = () => {
    if (customName.trim() && customEmoji) {
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
    (cat) => cat.id === 'all' || DEFAULT_EXERCISES.some((ex) => ex.category === cat.id)
  );

  const commonEmojis = ['💪', '🏋️', '🦵', '🤸', '🔥', '⚡', '💥', '🚀', '🏃', '🧘'];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setShowCustomForm(false); }}>
      <DialogContent className="h-[90vh] flex flex-col p-0 gap-0 rounded-t-2xl sm:rounded-2xl">

        {!showCustomForm ? (
          <>
            <div className="px-5 pt-5 pb-3 flex-shrink-0">
              <DialogHeader>
                <DialogTitle className="text-lg">Choisir un exercice</DialogTitle>
              </DialogHeader>
            </div>

            {/* Recherche */}
            <div className="px-5 pb-3 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 bg-muted border-0 focus-visible:ring-1"
                  autoFocus={false}
                />
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
            <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-2">
              {filteredExercises.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-10">
                  Aucun exercice trouvé
                </p>
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
                        <span className="text-2xl w-9 text-center flex-shrink-0">{exercise.emoji}</span>
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
                  placeholder="Ex: Planche"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="h-11"
                  autoFocus
                />
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
                  disabled={!customName.trim()}
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
