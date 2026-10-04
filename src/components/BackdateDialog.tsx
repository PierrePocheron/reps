import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Valeur d'un <input type="datetime-local"> en heure locale (AAAA-MM-JJTHH:MM). */
const toLocalInput = (ms: number) => {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};

/** Séance oubliée (#58, comme Hevy « Log past workout ») : date, heure et durée réelles de la séance. */
export function BackdateDialog({ initial, onCancel, onSave }: {
  initial: { at: number; duration: number } | null;
  onCancel: () => void;
  onSave: (backdate: { at: number; duration: number } | null) => void;
}) {
  const [at, setAt] = useState(() => toLocalInput(initial?.at ?? Date.now() - 24 * 3600_000));
  const [minutes, setMinutes] = useState(() => String(initial ? Math.round(initial.duration / 60) : 60));
  const when = new Date(at).getTime();
  const valid = !Number.isNaN(when) && when <= Date.now() && Number(minutes) > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Séance faite plus tôt ?</DialogTitle>
          <DialogDescription>Elle sera enregistrée à cette date : ta série et tes stats en tiendront compte.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="backdate-at">Début de la séance</Label>
            <Input id="backdate-at" type="datetime-local" value={at} max={toLocalInput(Date.now())} onChange={(e) => setAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="backdate-min">Durée (minutes)</Label>
            <Input id="backdate-min" type="number" min={1} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </div>
          {!Number.isNaN(when) && when > Date.now() && <p className="text-xs text-destructive">La date ne peut pas être dans le futur.</p>}
        </div>
        <div className="flex gap-2">
          {initial ? (
            <Button variant="outline" className="flex-1 min-h-11" onClick={() => onSave(null)}>Maintenant</Button>
          ) : (
            <Button variant="outline" className="flex-1 min-h-11" onClick={onCancel}>Annuler</Button>
          )}
          <Button className="flex-1 min-h-11" disabled={!valid} onClick={() => onSave({ at: when, duration: Math.round(Number(minutes) * 60) })}>Valider</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
