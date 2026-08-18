import { X } from 'lucide-react';
import { MEDIA_ATTRIBUTION } from '@/hooks/useExerciseImages';
import { useLanguage } from '@/hooks/useLanguage';
import { targetLabel } from '@/utils/exerciseLabels';

const T = {
  fr: { howTo: 'Comment faire', noDesc: 'Pas de description disponible.', illustration: 'Illustration' },
  en: { howTo: 'How to', noDesc: 'No description available.', illustration: 'Illustration' },
} as const;

interface Props {
  exerciseId: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  description: string | null;
  steps?: string[];
  target?: string | null;
  secondaryMuscles?: string[];
  onClose: () => void;
}

export function ExerciseDetailSheet({
  name,
  emoji,
  imageUrl,
  description,
  steps,
  target,
  secondaryMuscles,
  onClose,
}: Props) {
  const lang = useLanguage();
  const t = T[lang];
  const hasSteps = steps && steps.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full sm:max-w-md bg-background rounded-t-3xl shadow-xl flex flex-col max-h-[85dvh]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 shrink-0">
          <span className="text-2xl">{emoji}</span>
          <h2 className="flex-1 font-bold text-lg leading-tight">{name}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-8 space-y-4">
          {/* Image / GIF */}
          {imageUrl ? (
            <div className="w-full rounded-2xl overflow-hidden bg-white flex items-center justify-center">
              <img
                src={imageUrl}
                alt={name}
                className="w-full max-h-72 object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-48 rounded-2xl bg-muted flex items-center justify-center">
              <span className="text-6xl">{emoji}</span>
            </div>
          )}

          {/* Muscles ciblés */}
          {target && (
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {targetLabel(target, lang)}
              </span>
              {secondaryMuscles?.filter((m) => m !== target).map((m) => (
                <span
                  key={m}
                  className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium"
                >
                  {targetLabel(m, lang)}
                </span>
              ))}
            </div>
          )}

          {/* Instructions */}
          {hasSteps ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{t.howTo}</h3>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ) : description ? (
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">{t.howTo}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.noDesc}
            </p>
          )}

          {/* Attribution obligatoire des médias Gym visual */}
          {imageUrl && (
            <p className="text-[10px] text-muted-foreground/60 text-center">
              {t.illustration} {MEDIA_ATTRIBUTION}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
