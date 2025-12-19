import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_EXERCISES } from '@/utils/constants';
import { Check, Plus } from 'lucide-react';

interface AddExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddDefault: (exerciseId: string) => void;
  onAddCustom: (name: string, emoji: string) => void;
  hasExercise: (name: string) => boolean;
}

/**
 * Dialog pour ajouter un exercice (défaut ou personnalisé)
 */
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

  const handleAddDefault = (exerciseId: string) => {
    const exercise = DEFAULT_EXERCISES.find((ex) => ex.id === exerciseId);
    if (exercise && !hasExercise(exercise.name)) {
      onAddDefault(exerciseId);
      onOpenChange(false);
    }
  };

  const handleAddCustom = () => {
    if (customName.trim() && customEmoji) {
      onAddCustom(customName.trim(), customEmoji);
      setCustomName('');
      setCustomEmoji('💪');
      setShowCustomForm(false);
      onOpenChange(false);
    }
  };

  const commonEmojis = ['💪', '🏋️', '🦵', '🤸', '🔥', '⚡', '💥', '🚀', '🏃', '🧘'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un exercice</DialogTitle>
          <DialogDescription>
            Choisissez un exercice dans la liste ou créez-en un nouveau.
          </DialogDescription>
        </DialogHeader>

        {!showCustomForm ? (
          <>
            {/* Exercices par défaut */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {DEFAULT_EXERCISES.map((exercise) => {
                const isAdded = hasExercise(exercise.name);
                return (
                  <Button
                    key={exercise.id}
                    variant={isAdded ? 'secondary' : 'outline'}
                    disabled={isAdded}
                    onClick={() => handleAddDefault(exercise.id)}
                    className="h-auto py-4 flex flex-col gap-2 relative"
                  >
                    <span className="text-2xl">{exercise.emoji}</span>
                    <span>{exercise.name}</span>
                    {isAdded && (
                      <Check className="h-4 w-4 absolute top-2 right-2" />
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Bouton pour exercice personnalisé */}
            <Button
              variant="outline"
              onClick={() => setShowCustomForm(true)}
              className="w-full mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer un exercice personnalisé
            </Button>
          </>
        ) : (
          <div className="space-y-4 mt-4">
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
                    onClick={() => setCustomEmoji(emoji)}
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

            <div className="flex gap-2">
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

