import { X } from 'lucide-react';

interface Props {
  exerciseId: string;
  name: string;
  emoji: string;
  imageUrl: string | null;
  description: string | null;
  onClose: () => void;
}

export function ExerciseDetailSheet({ name, emoji, imageUrl, description, onClose }: Props) {
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
            <div className="w-full rounded-2xl overflow-hidden bg-muted flex items-center justify-center">
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

          {/* Description */}
          {description ? (
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">Comment faire</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Pas de description disponible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
