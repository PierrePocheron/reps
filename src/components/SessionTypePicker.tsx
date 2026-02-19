import { useNavigate } from 'react-router-dom';
import { Dumbbell, Zap, X } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useGymSessionStore } from '@/store/gymSessionStore';

interface SessionTypePickerProps {
  open: boolean;
  onClose: () => void;
}

export function SessionTypePicker({ open, onClose }: SessionTypePickerProps) {
  const navigate = useNavigate();
  const haptics = useHaptic();
  const { startPlanning } = useGymSessionStore();

  if (!open) return null;

  const handleRenforcement = () => {
    haptics.impact();
    onClose();
    navigate('/session');
  };

  const handleMusculation = () => {
    haptics.impact();
    startPlanning();
    onClose();
    navigate('/gym');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="px-5 pt-2 pb-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold">Choisir le type de séance</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Renforcement */}
            <button
              onClick={handleRenforcement}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98] text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 flex-shrink-0">
                <Zap className="h-6 w-6 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base">Renforcement</p>
                <p className="text-sm text-muted-foreground">
                  Bodyweight · Calisthenics · Max reps
                </p>
              </div>
            </button>

            {/* Musculation */}
            <button
              onClick={handleMusculation}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98] text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 flex-shrink-0">
                <Dumbbell className="h-6 w-6 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base">Musculation</p>
                <p className="text-sm text-muted-foreground">
                  Haltères · Barre · Séries × Reps × Poids
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
