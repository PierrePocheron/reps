import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface SummaryStat { label: string; value: string }

/**
 * Écran de fin de séance (#54, comme le « Workout complete » de Hevy) : récap, comparaison, partager.
 * L'emoji tient la place de la mascotte (#20) en attendant sa charte.
 */
export function SessionSummary({ stats, comparison, onShare, onDone }: {
  stats: SummaryStat[];
  comparison: string | null;
  onShare: () => void;
  onDone: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-28 animate-fade-in">
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col items-center text-center gap-6">
        <div className="text-6xl" aria-hidden>💪</div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Séance terminée{'\u00a0'}!</h1>{/* no-break space: the « ! » wrapped alone at 320 px */}
          {comparison && <p className="mt-2 text-sm text-muted-foreground">{comparison}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-3 w-full">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4">
              <dt className="text-xs text-muted-foreground">{s.label}</dt>
              <dd className="text-xl min-[360px]:text-2xl font-bold tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="w-full mt-auto space-y-2">
          <Button variant="outline" className="w-full min-h-11" onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" /> Partager ma séance
          </Button>
          <Button className="w-full min-h-11" onClick={onDone}>Terminer</Button>
        </div>
      </div>
    </div>
  );
}
