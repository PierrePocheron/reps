import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MUSCULATION_EXERCISES } from '@/utils/constants';
import type { WorkoutTemplate } from '@/firebase/types';
import { useExerciseImages } from '@/hooks/useExerciseImages';

interface Props {
  template: WorkoutTemplate | null;
  onClose: () => void;
  onStart: (template: WorkoutTemplate) => void;
}

export function GymTemplatePreviewSheet({ template, onClose, onStart }: Props) {
  const { imageMap } = useExerciseImages();

  useEffect(() => {
    if (!template) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [template, onClose]);

  if (!template) return null;

  const exercises = (template.muscuExercises ?? []).map((me) => {
    const ex = MUSCULATION_EXERCISES.find((e) => e.id === me.exerciseId);
    return {
      exerciseId: me.exerciseId,
      name: ex?.name ?? me.exerciseId,
      emoji: ex?.emoji ?? '🏋️',
      imageUrl: imageMap[me.exerciseId] ?? ex?.imageUrl,
      sets: me.sets,
    };
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gym-template-preview-title"
        className="relative z-10 w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[88dvh]"
      >
        {/* Handle + header, like the other sheets (close button on the right) */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center gap-3 px-5 py-3 shrink-0">
          <span className="text-2xl">{template.emoji}</span>
          <h2 id="gym-template-preview-title" className="flex-1 font-bold text-lg leading-tight">{template.name}</h2>
          <button onClick={onClose} aria-label="Fermer" className="flex h-11 w-11 -mr-2 items-center justify-center rounded-full hover:bg-muted active:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Exercises list */}
        <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-1">
          {exercises.map((ex, idx) => (
            <div key={idx} className="flex items-center gap-3 py-3 border-b border-border/40 last:border-b-0">
              {/* Image or emoji */}
              <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                {ex.imageUrl ? (
                  <img src={ex.imageUrl} alt={ex.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl">{ex.emoji}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{ex.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ex.sets.length} série{ex.sets.length > 1 ? 's' : ''}
                  {ex.sets[0] && (
                    <span> · {ex.sets[0].reps} reps{ex.sets[0].weight > 0 ? ` à ${ex.sets[0].weight.toLocaleString('fr-FR')} kg` : ''}</span>
                  )}
                </p>
              </div>

              {/* Sets summary pills */}
              <div className="flex flex-wrap gap-1 justify-end max-w-[96px]">
                {ex.sets.slice(0, 4).map((s, i) => (
                  <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded-md font-mono text-muted-foreground">
                    {s.reps}×{s.weight > 0 ? s.weight.toLocaleString('fr-FR') : 'PDC'}
                  </span>
                ))}
                {ex.sets.length > 4 && (
                  <span className="text-xs text-muted-foreground">+{ex.sets.length - 4}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky footer CTA */}
        <div className="px-5 pb-8 pt-3 border-t shrink-0">
          <Button
            className="w-full h-12 text-base font-semibold"
            onClick={() => onStart(template)}
          >
            Commencer l'entraînement
          </Button>
        </div>
      </div>
    </div>
  );
}
