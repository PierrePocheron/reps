import { useEffect, useState } from 'react';
import { Plus, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/userStore';
import { getBodyEntries, saveBodyEntries } from '@/firebase/bodyMetrics';
import { BODY_FIELDS, bodySeries, upsertBodyEntry, type BodyEntry, type BodyField } from '@/utils/body';
import { localDay, frDate } from '@/utils/formatters';
import { logger } from '@/utils/logger';
import { cn } from '@/utils/cn';

const W = 320, H = 110, PX = 8, PY = 12;
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

function MiniChart({ points, unit }: { points: { date: Date; value: number }[]; unit: string }) {
  if (points.length < 2) {
    return <p className="text-xs text-muted-foreground text-center py-6">{points.length ? 'Encore une mesure pour voir la courbe.' : 'Pas encore de mesure.'}</p>;
  }
  const vs = points.map((p) => p.value);
  const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const t0 = points[0]!.date.getTime(), t1 = points[points.length - 1]!.date.getTime();
  const xy = points.map((p) => [PX + ((p.date.getTime() - t0) / (t1 - t0 || 1)) * (W - 2 * PX), PY + (1 - (p.value - lo) / span) * (H - 2 * PY)] as const);
  const first = vs[0]!, last = vs[vs.length - 1]!;
  const day = (d: Date) => frDate(d, { day: 'numeric', month: 'short' });
  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto text-primary" role="img"
        aria-label={`De ${fmt(first)} à ${fmt(last)} ${unit} entre le ${day(points[0]!.date)} et le ${day(points[points.length - 1]!.date)}`}>
        <polyline points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="currentColor" />)}
      </svg>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{day(points[0]!.date)}</span>
        <span className="font-semibold text-foreground">{last - first >= 0 ? '+' : '−'}{fmt(Math.abs(last - first))} {unit}</span>
        <span>{day(points[points.length - 1]!.date)}</span>
      </div>
    </div>
  );
}

/** Poids et mensurations datés (Hevy Pro, ici gratuit), dans le document privé du compte. */
export function BodyMetrics() {
  const { user, updateProfile } = useUserStore();
  const { toast } = useToast();
  // null: not read yet. Never treated as empty: saving would write a one-entry list over the whole history
  const [entries, setEntries] = useState<BodyEntry[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [field, setField] = useState<BodyField>('weight');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = (uid: string) => {
    setLoadFailed(false);
    getBodyEntries(uid).then(setEntries).catch((err) => { logger.error('Lecture des mesures :', err); setLoadFailed(true); });
  };
  useEffect(() => { if (user?.uid) load(user.uid); }, [user?.uid]);

  if (!user) return null;
  const list = entries ?? [];
  const meta = BODY_FIELDS.find((f) => f.key === field)!;
  // Sans mesure saisie, le poids du profil fait foi (évite « – » à côté de « Poids 64 kg »)
  const latest = (key: BodyField) => [...list].reverse().find((e) => e[key])?.[key] ?? (key === 'weight' ? user.weight : undefined);

  const save = async () => {
    if (entries === null) return;
    const entry: BodyEntry = { date: form.date || localDay(new Date()) };
    for (const f of BODY_FIELDS) if (Number(form[f.key]) > 0) entry[f.key] = Number(form[f.key]);
    if (Object.keys(entry).length === 1) return;
    setSaving(true);
    try {
      const next = upsertBodyEntry(entries, entry);
      await saveBodyEntries(user.uid, next);
      setEntries(next);
      // Le poids le plus récent sert aussi au calcul des calories
      const lastWeight = [...next].reverse().find((e) => e.weight)?.weight;
      if (lastWeight && lastWeight !== user.weight) await updateProfile({ weight: lastWeight });
      setOpen(false);
      toast({ title: 'Mesure enregistrée' });
    } catch (err) {
      logger.error('Enregistrement des mesures :', err);
      toast({ title: 'Erreur', description: "La mesure n'a pas pu être enregistrée.", variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Ruler className="h-5 w-5" /> Poids et mensurations
        </CardTitle>
        <Button size="sm" variant="outline" className="min-h-11" disabled={entries === null} onClick={() => { setForm({ date: localDay(new Date()) }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Mesure
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="Mesure affichée">
          {BODY_FIELDS.map((f) => {
            const v = latest(f.key);
            return (
              <button key={f.key} onClick={() => setField(f.key)} aria-pressed={field === f.key}
                className={cn('flex-shrink-0 min-h-11 px-3 rounded-xl border text-left', field === f.key ? 'border-primary bg-primary/10' : 'border-border')}>
                <span className="block text-[11px] text-muted-foreground">{f.label}</span>
                <span className="block text-sm font-semibold">{v ? `${fmt(v)} ${f.unit}` : '–'}</span>
              </button>
            );
          })}
        </div>
        {loadFailed
          ? (
            <div className="h-28 rounded-xl bg-muted flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
              Mesures indisponibles pour l'instant.
              <Button size="sm" variant="outline" className="min-h-11" onClick={() => load(user.uid)}>Réessayer</Button>
            </div>
          )
          : entries === null
          ? <div className="h-28 rounded-xl bg-muted animate-pulse" aria-label="Chargement des mesures" />
          : <MiniChart points={bodySeries(list, field)} unit={meta.unit} />}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouvelle mesure</DialogTitle>
            <DialogDescription>Remplis seulement ce que tu as mesuré.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block text-sm">
              Date
              <Input type="date" value={form.date ?? ''} max={localDay(new Date())} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              {BODY_FIELDS.map((f) => (
                <label key={f.key} className="block text-sm">
                  {f.label} ({f.unit})
                  <Input type="number" inputMode="decimal" min={0} step={0.1} value={form[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="mt-1" />
                </label>
              ))}
            </div>
            <Button className="w-full min-h-11" onClick={save} disabled={saving || !BODY_FIELDS.some((f) => Number(form[f.key]) > 0)}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
