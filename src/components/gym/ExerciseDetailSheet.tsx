import { useEffect, useState } from 'react';
import { frDate } from '@/utils/formatters';
import { X } from 'lucide-react';
import { MEDIA_ATTRIBUTION } from '@/hooks/useExerciseImages';
import { useLanguage } from '@/hooks/useLanguage';
import { targetLabel } from '@/utils/exerciseLabels';
import { ExerciseProgressChart } from '@/components/gym/ExerciseProgressChart';
import type { ExercisePoint, ExerciseLogEntry } from '@/utils/records';

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
  /** Historique de l'utilisateur sur l'exercice (muscu) : affiche la courbe de progression */
  history?: ExercisePoint[];
  timed?: boolean; // exercice en durée : courbe de la meilleure durée (#55)
  log?: ExerciseLogEntry[]; // dernières séances, séries en clair (#60)
  onReplace?: () => void; // en séance : remplacer par un autre exercice (#62)
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
  history,
  timed,
  log,
  onReplace,
  onClose,
}: Props) {
  const lang = useLanguage();
  const t = T[lang];
  const hasSteps = steps && steps.length > 0;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => { setImgFailed(false); }, [imageUrl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exercise-detail-title"
        className="relative z-10 w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[85dvh]"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 shrink-0">
          <span className="text-2xl">{emoji}</span>
          <h2 id="exercise-detail-title" className="flex-1 font-bold text-lg leading-tight">{name}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-4">
          {/* Image / GIF */}
          {imageUrl && !imgFailed ? (
            <div className="w-full min-h-48 rounded-2xl overflow-hidden bg-white flex items-center justify-center">
              <img
                src={imageUrl}
                alt={name}
                loading="lazy"
                onError={() => setImgFailed(true)}
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

          {history && <ExerciseProgressChart points={history} timed={timed} />}

          {log && log.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Dernières séances</h3>
              <ul className="divide-y rounded-xl border">
                {log.map((e, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
                    <span className="shrink-0 text-xs text-muted-foreground">{frDate(e.date, { day: 'numeric', month: 'short' })}</span>
                    <span className="text-right tabular-nums">{e.record && <span aria-label="Record">🏆 </span>}{e.sets}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onReplace && (
            <button type="button" onClick={onReplace}
              className="w-full min-h-11 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/40">
              ⇄ Remplacer par un autre exercice
            </button>
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
            <p className="text-xs text-muted-foreground text-center">
              {t.illustration} {MEDIA_ATTRIBUTION}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
