import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_EXERCISES, EXERCISE_CATEGORIES } from '@/utils/constants';
import { Check, Plus, Search } from 'lucide-react';
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

  const commonEmojis = ['💪', '🏋️', '🦵', '🤸', '🔥', '⚡', '💥', '🚀', '🏃', '🧘'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col p-0 gap-0">
        <div className="px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle>Ajouter un exercice</DialogTitle>
            <DialogDescription>
              Choisissez un exercice ou créez-en un nouveau.
            </DialogDescription>
          </DialogHeader>
        </div>

        {!showCustomForm ? (
          <>
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

            {/* Onglets catégories (scrollable horizontal) */}
            <div className="px-6 pb-3 overflow-x-auto scrollbar-none">
              <div className="flex gap-2 min-w-max">
                {EXERCISE_CATEGORIES.map((cat) => (
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
            <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
              {filteredExercises.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Aucun exercice trouvé
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredExercises.map((exercise) => {
                    const isAdded = hasExercise(exercise.name);
                    return (
                      <button
                        key={exercise.id}
                        disabled={isAdded}
                        onClick={() => handleAddDefault(exercise.id)}
                        className={`relative flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 transition-all text-sm font-medium ${
                          isAdded
                            ? 'border-primary/30 bg-primary/5 text-muted-foreground cursor-not-allowed'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50 active:scale-95'
                        }`}
                      >
                        <span className="text-2xl">{exercise.emoji}</span>
                        <span className="text-center leading-tight">{exercise.name}</span>
                        {isAdded && (
                          <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bouton exercice personnalisé */}
            <div className="px-6 py-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowCustomForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un exercice personnalisé
              </Button>
            </div>
          </>
        ) : (
          <div className="px-6 pb-6 space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="customName">Nom de l'exercice</Label>
              <Input
                id="customName"
                placeholder="Ex: Planche"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Emoji</Label>
              <div className="flex flex-wrap gap-2">
                {commonEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setCustomEmoji(emoji);
                    }}
                    className={`text-2xl p-2 rounded-md border-2 transition-all ${
                      customEmoji === emoji
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Ou tapez un emoji"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                maxLength={2}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomForm(false);
                  setCustomName('');
                  setCustomEmoji('💪');
                }}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddCustom}
                disabled={!customName.trim()}
                className="flex-1"
              >
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
