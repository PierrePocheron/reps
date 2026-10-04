import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Session, SessionExercise } from '@/firebase/types';

/** Modifier une séance renfo passée (#57) : reps par exercice, retirer un exercice. */
export function EditRenfoSessionDialog({ session, onCancel, onSave }: {
  session: Session;
  onCancel: () => void;
  onSave: (exercises: SessionExercise[]) => Promise<void>;
}) {
  const [exercises, setExercises] = useState<SessionExercise[]>(() => session.exercises.map((ex) => ({ ...ex })));
  const [saving, setSaving] = useState(false);
  const kept = exercises.filter((ex) => ex.reps > 0);
  const save = async () => {
    setSaving(true);
    try { await onSave(kept); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la séance</DialogTitle>
          <DialogDescription>Corrige les répétitions ; total, calories et stats sont recalculés.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {exercises.map((ex, i) => (
            <div key={`${ex.name}-${i}`} className="flex items-center gap-2">
              <span className="flex-1 min-w-0 truncate text-sm font-medium">{ex.emoji} {ex.name}</span>
              <Input type="number" min={0} inputMode="numeric" value={ex.reps || ''} placeholder="0"
                className="h-9 w-20 text-sm text-center p-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Répétitions de ${ex.name}`}
                onChange={(e) => setExercises((list) => list.map((x, j) => (j === i ? { ...x, reps: Math.max(0, Math.round(Number(e.target.value) || 0)) } : x)))} />
              <span className="text-xs text-muted-foreground">reps</span>
              <button type="button" onClick={() => setExercises((list) => list.filter((_, j) => j !== i))} aria-label={`Retirer ${ex.name}`}
                className="h-11 w-11 -mr-2 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        {kept.length === 0 && <p className="text-xs text-muted-foreground">Plus aucune répétition : supprime plutôt la séance depuis l'historique.</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 min-h-11" onClick={onCancel} disabled={saving}>Annuler</Button>
          <Button className="flex-1 min-h-11" onClick={() => void save()} disabled={saving || kept.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
