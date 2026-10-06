import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { DEFAULT_PLATES, loadPlatePrefs, platesPerSide, savePlatePrefs } from '@/utils/plates';

const BARS = [20, 15, 10];
// Couleurs olympiques usuelles, pour reconnaître les disques d'un coup d'œil
const PLATE_COLOR: Record<number, string> = { 25: 'bg-red-500', 20: 'bg-blue-500', 15: 'bg-yellow-400', 10: 'bg-green-500', 5: 'bg-slate-100', 2.5: 'bg-zinc-800', 1.25: 'bg-slate-400' };
const fmt = (n: number) => n.toLocaleString('fr-FR');

/** Calculateur de disques : quels disques mettre de chaque côté de la barre pour la charge visée. */
export function PlateCalculator({ open, onOpenChange, weight, exerciseName }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weight: number;
  exerciseName: string;
}) {
  const [target, setTarget] = useState(String(weight));
  const [prefs, setPrefs] = useState(loadPlatePrefs);

  useEffect(() => { if (open) setTarget(String(weight)); }, [open, weight]);
  const save = (next: typeof prefs) => {
    setPrefs(next);
    savePlatePrefs(next);
  };

  const { plates, total } = platesPerSide(Number(target) || 0, prefs.bar, prefs.plates);
  const exact = Math.abs(total - (Number(target) || 0)) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Disques — {exerciseName}</DialogTitle>
          <DialogDescription>À mettre de chaque côté de la barre.</DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 text-sm">
          Charge visée
          <Input type="number" inputMode="decimal" min={0} step={0.5} value={target} onChange={(e) => setTarget(e.target.value)} className="w-24" />
          kg
        </label>

        <div className="rounded-2xl bg-muted/50 p-4 text-center space-y-3" aria-live="polite">
          <div className="flex items-center justify-center gap-1 h-20" aria-hidden>
            <div className="h-2 w-10 rounded-l bg-zinc-400" />
            {plates.map((p, i) => (
              <div key={i} className={cn('w-3 rounded-sm border border-black/20 dark:border-white/40', PLATE_COLOR[p] ?? 'bg-primary')} style={{ height: `${36 + p * 1.6}px` }} />
            ))}
            <div className="h-2 w-6 rounded-r bg-zinc-400" />
          </div>
          <p className="font-semibold">
            {plates.length ? `Par côté : ${plates.map(fmt).join(' + ')} kg` : 'Barre seule'}
          </p>
          <p className={cn('text-xs', exact ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400')}>
            {exact ? `Total : ${fmt(total)} kg` : `Charge exacte impossible : ${fmt(total)} kg au plus proche`}
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-muted-foreground">Barre</legend>
          <div className="flex gap-2">
            {BARS.map((b) => (
              <button key={b} type="button" aria-pressed={prefs.bar === b} onClick={() => save({ ...prefs, bar: b })}
                className={cn('flex-1 min-h-11 rounded-xl text-sm font-medium border', prefs.bar === b ? 'bg-primary text-primary-foreground border-primary' : 'border-border')}>
                {b} kg
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-muted-foreground">Disques disponibles</legend>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_PLATES.map((p) => {
              const on = prefs.plates.includes(p);
              return (
                <button key={p} type="button" aria-pressed={on}
                  onClick={() => save({ ...prefs, plates: on ? prefs.plates.filter((x) => x !== p) : [...prefs.plates, p] })}
                  className={cn('min-h-11 min-w-11 px-3 rounded-xl text-sm font-medium border', on ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground line-through')}>
                  {fmt(p)}
                </button>
              );
            })}
          </div>
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
