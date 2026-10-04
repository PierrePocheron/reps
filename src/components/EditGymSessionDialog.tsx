import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SET_TYPE_META, nextSetType } from '@/utils/setTypes';
import { isTimed } from '@/utils/records';
import { cn } from '@/utils/cn';
import type { GymSession, GymSessionExercise, PlannedSet } from '@/firebase/types';

const NUM = 'h-9 w-16 text-sm text-center p-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none';

/** Modifier une séance muscu passée (#57, comme Hevy / Strong) : reps, charge, type ; ajouter ou retirer une série. */
export function EditGymSessionDialog({ session, onCancel, onSave }: {
  session: GymSession;
  onCancel: () => void;
  onSave: (exercises: GymSessionExercise[]) => Promise<void>;
}) {
  // Working copy: every set, the done ones are edited on their achieved values. The target and the unfinished sets
  // stay as they were, otherwise the next session's load suggestion read missed reps as « tout réussi »
  const [exercises, setExercises] = useState<GymSessionExercise[]>(() => session.exercises.map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => (s.completed ? { ...s, actualReps: s.actualReps ?? s.reps, actualWeight: s.actualWeight ?? s.weight } : s)),
  })));
  const [saving, setSaving] = useState(false);

  const patch = (i: number, j: number, p: Partial<PlannedSet>) =>
    setExercises((list) => list.map((ex, a) => (a !== i ? ex : { ...ex, sets: ex.sets.map((s, b) => (b === j ? { ...s, ...p } : s)) })));
  const removeSet = (i: number, j: number) =>
    setExercises((list) => list.map((ex, a) => (a !== i ? ex : { ...ex, sets: ex.sets.filter((_, b) => b !== j) })));
  const addSet = (i: number) =>
    setExercises((list) => list.map((ex, a) => {
      if (a !== i) return ex;
      const last = [...ex.sets].reverse().find((s) => s.completed);
      const reps = last?.actualReps ?? 10, weight = last?.actualWeight ?? 0;
      return { ...ex, sets: [...ex.sets, { reps, weight, actualReps: reps, actualWeight: weight, completed: true }] };
    }));

  const kept = exercises.filter((ex) => ex.sets.some((s) => s.completed));
  const save = async () => {
    setSaving(true);
    try { await onSave(kept); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Modifier la séance</DialogTitle>
          <DialogDescription>Corrige charges et répétitions ; volume, records et stats sont recalculés.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {exercises.map((ex, i) => (
            <section key={ex.exerciseId} aria-label={ex.name} className="space-y-2">
              <h3 className="text-sm font-semibold">{ex.emoji} {ex.name}</h3>
              {ex.sets.map((s, j) => (!s.completed ? null : (
                <div key={j} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => patch(i, j, { type: nextSetType(s.type) })}
                    aria-label={`Série ${j + 1} : ${s.type ? SET_TYPE_META[s.type].label : 'normale'} — changer le type`}
                    className={cn('h-11 w-8 shrink-0 rounded-lg text-xs font-bold', s.type ? SET_TYPE_META[s.type].cls : 'text-muted-foreground')}
                  >
                    {s.type ? SET_TYPE_META[s.type].short : `S${j + 1}`}
                  </button>
                  <Input type="number" min={0} inputMode="numeric" value={s.actualReps || ''} placeholder="0" className={NUM}
                    aria-label={`Répétitions, série ${j + 1} de ${ex.name}`}
                    onChange={(e) => patch(i, j, { actualReps: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                  <span className="text-xs text-muted-foreground">{isTimed(ex) ? 's' : 'reps'}</span>
                  <Input type="number" min={0} step="0.5" inputMode="decimal" value={s.actualWeight || ''} placeholder="0" className={NUM}
                    aria-label={`Charge en kg, série ${j + 1} de ${ex.name}`}
                    onChange={(e) => patch(i, j, { actualWeight: Math.max(0, Number(e.target.value) || 0) })} />
                  <span className="text-xs text-muted-foreground">kg</span>
                  <button type="button" onClick={() => removeSet(i, j)} aria-label={`Retirer la série ${j + 1} de ${ex.name}`}
                    className="ml-auto h-11 w-11 -mr-2 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )))}
              <button type="button" onClick={() => addSet(i)} className="min-h-11 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Plus className="h-3.5 w-3.5" aria-hidden /> Ajouter une série
              </button>
            </section>
          ))}
        </div>
        {kept.length === 0 && <p className="text-xs text-muted-foreground">Plus aucune série : supprime plutôt la séance depuis l'historique.</p>}
        {/* Boutons toujours visibles, même quand la liste défile (séance longue) */}
        <div className="sticky -bottom-6 -mx-6 -mb-6 px-6 pt-3 pb-6 flex flex-wrap gap-2 bg-background border-t">
          <Button variant="outline" className="flex-1 basis-28 min-h-11" onClick={onCancel} disabled={saving}>Annuler</Button>
          <Button className="flex-1 basis-28 min-h-11" onClick={() => void save()} disabled={saving || kept.length === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
