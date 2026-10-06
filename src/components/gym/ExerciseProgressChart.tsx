import { useState } from 'react';
import { frDate } from '@/utils/formatters';
import { TrendingUp, Trophy } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ExercisePoint } from '@/utils/records';

const METRICS = [
  { key: 'e1rm', label: '1RM estimé', unit: 'kg', kind: 'load' },
  { key: 'bestWeight', label: 'Charge max', unit: 'kg', kind: 'load' },
  { key: 'volume', label: 'Volume', unit: 'kg', kind: 'load' },
  { key: 'bestReps', label: 'Reps max', unit: 'reps', kind: 'bodyweight' }, // no load in the period
  { key: 'bestSeconds', label: 'Meilleure durée', unit: 's', kind: 'time' }, // exercice en durée (#55)
] as const;
const PERIODS = [
  { key: '3m', label: '3 mois', days: 91 },
  { key: '1y', label: '1 an', days: 365 },
  { key: 'all', label: 'Tout', days: Infinity },
] as const;

const W = 320, H = 150, PL = 38, PR = 10, PT = 14, PB = 24;
const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 }); // 77,5 kg, not 78
const dayMonth = (d: Date) => frDate(d, { day: 'numeric', month: 'short' });

/** Courbe de progression d'un exercice (Strong / Hevy : graphique par exercice). */
export function ExerciseProgressChart({ points, timed }: { points: ExercisePoint[]; timed?: boolean }) {
  const [chosen, setMetric] = useState<(typeof METRICS)[number]['key']>(timed ? 'bestSeconds' : 'e1rm');
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('3m');

  const days = PERIODS.find((p) => p.key === period)!.days;
  const since = Date.now() - days * 86_400_000;
  const inPeriod = points.filter((p) => p.date.getTime() >= since);
  // at bodyweight, 1RM, load and volume are all 0: reps are offered whenever a session has no load (one weighted
  // session hid them all), the load metrics whenever one has
  const kinds = timed ? ['time'] : [
    ...(inPeriod.some((p) => p.bestWeight > 0) ? ['load'] : []),
    ...(inPeriod.length === 0 || inPeriod.some((p) => p.bestWeight === 0) ? ['bodyweight'] : []),
  ];
  const metrics = METRICS.filter((m) => kinds.includes(m.kind));
  const metric = metrics.some((m) => m.key === chosen) ? chosen : metrics[0]!.key;
  const shown = inPeriod.filter((p) => p[metric] > 0);
  const values = shown.map((p) => p[metric]);

  const header = (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-primary" /> Ta progression
      </h3>
      <div className="flex gap-1" role="group" aria-label="Période">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={period === p.key}
            onClick={() => setPeriod(p.key)}
            className={cn('px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors',
              period === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (shown.length === 0) {
    return (
      <div className="space-y-3">
        {header}
        <p className="rounded-2xl bg-muted/50 p-4 text-center text-sm text-muted-foreground">
          {points.length === 0
            ? 'Pas encore de séance sur cet exercice. Termine une séance pour voir ta courbe.'
            : 'Aucune séance sur cette période.'}
        </p>
      </div>
    );
  }

  const unit = METRICS.find((m) => m.key === metric)!.unit;
  const max = Math.max(...values), min = Math.min(...values);
  const lo = min === max ? min * 0.9 : min - (max - min) * 0.15;
  const hi = min === max ? max * 1.1 : max + (max - min) * 0.15;
  const t0 = shown[0]!.date.getTime(), t1 = shown[shown.length - 1]!.date.getTime();
  const x = (t: number) => (t1 === t0 ? (PL + W - PR) / 2 : PL + ((t - t0) / (t1 - t0)) * (W - PL - PR));
  const tick = (v: number) => v.toLocaleString('fr-FR', { maximumFractionDigits: hi - lo < 10 ? 1 : 0 }); // decimal only on a narrow scale
  const y = (v: number) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
  const coords = shown.map((p) => [x(p.date.getTime()), y(p[metric])] as const);
  const line = coords.map(([cx, cy], i) => `${i ? 'L' : 'M'}${cx.toFixed(1)} ${cy.toFixed(1)}`).join(' ');
  const recordIdx = values.indexOf(max);
  const first = values[0]!, last = values[values.length - 1]!;
  const delta = Math.round((last - first) * 10) / 10; // as shown: a change that rounds to 0 is « stable », not « −0 kg »

  return (
    <div className="space-y-3">
      {header}
      <div className="flex gap-1" role="group" aria-label="Mesure">
        {metrics.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={cn('flex-1 py-2 rounded-lg text-xs font-semibold transition-colors',
              metric === m.key ? 'bg-background shadow-sm text-foreground ring-1 ring-border' : 'text-muted-foreground')}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-1 font-semibold">
          <Trophy className="h-4 w-4 text-amber-500" /> Record : {fmt(max)} {unit}
        </span>
        {shown.length > 1 && (
          <span className={cn('text-xs font-semibold', delta > 0 ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}>
            {delta === 0 ? 'stable' : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))} ${unit}`} sur la période
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto text-primary"
        role="img"
        aria-label={`${METRICS.find((m) => m.key === metric)!.label} : de ${fmt(first)} à ${fmt(last)} ${unit}, record ${fmt(max)} ${unit}`}
      >
        {[hi, (hi + lo) / 2, lo].map((v) => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray="3 4" />
            <text x={PL - 6} y={y(v) + 3.5} textAnchor="end" className="fill-muted-foreground" fontSize="10">{tick(v)}</text>
          </g>
        ))}
        {coords.length > 1 && (
          <path d={`${line} L${coords[coords.length - 1]![0].toFixed(1)} ${H - PB} L${coords[0]![0].toFixed(1)} ${H - PB} Z`} fill="currentColor" opacity="0.1" />
        )}
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map(([cx, cy], i) => (
          i === recordIdx
            ? <circle key={i} cx={cx} cy={cy} r="5.5" fill="#F59E0B" stroke="hsl(var(--background))" strokeWidth="2" />
            : <circle key={i} cx={cx} cy={cy} r="3" fill="currentColor" />
        ))}
        <text x={PL} y={H - 6} className="fill-muted-foreground" fontSize="10">{dayMonth(shown[0]!.date)}</text>
        {shown.length > 1 && (
          <text x={W - PR} y={H - 6} textAnchor="end" className="fill-muted-foreground" fontSize="10">{dayMonth(shown[shown.length - 1]!.date)}</text>
        )}
      </svg>
      {shown.length === 1 && (
        <p className="text-xs text-center text-muted-foreground">Encore une séance pour voir la tendance.</p>
      )}
    </div>
  );
}
