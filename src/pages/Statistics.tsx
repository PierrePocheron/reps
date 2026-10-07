import { useState, useRef, useEffect } from 'react';
import { plural, frDate, formatNumber } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageLayout } from '@/components/layout/PageLayout';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Flame, Dumbbell, Calendar, Zap, AlertTriangle, Trophy, Sunrise, Sun, Moon, TrendingUp, ChevronRight, Target, Share2 } from 'lucide-react';
import { AdSpace } from '@/components/AdSpace';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ADS_CONFIG } from '@/config/ads';
import { useSessionHistory, usePeriodHistory } from '@/hooks/useSessionHistory';
import type { Session, GymSession, User } from '@/firebase/types';
import { calculateDynamicCalories } from '@/utils/calories';
import { findDefaultExercise } from '@/utils/constants';
import { setsByMuscle, MUSCLE_GROUPS, REPS_PER_SET } from '@/utils/muscles';
import { periodRecap, recapCard, recapRange, type RecapKind } from '@/utils/recap';
import { shareSessionCard } from '@/utils/shareCard';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// « Comment sont calculées les calories ? » example table, from the app's own formula so it cannot drift
const KCAL_EXAMPLES = ([['Tractions', 'Tractions'], ['Dips', 'Dips'], ['Squats', 'Squats'], ['Pompes', 'Pompes'], ['Abdos', 'Abdos'], ['Fentes', 'Fentes avant']] as const)
  .map(([label, name]) => ({ label, kcal: calculateDynamicCalories({ weight: 75, height: 175, gender: 'male' } as User, findDefaultExercise(name)!, 10) }));

// ─── Activity Heatmap ─────────────────────────────────────────────────────────

function ActivityCalendar({ sessions, gymSessions }: { sessions: Session[]; gymSessions: GymSession[] }) {
  const [selectedDay, setSelectedDay] = useState<{ date: Date; count: number } | null>(null);
  // With a large font the grid is wider than the card: open on the latest weeks (today), not the oldest
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollLeft = el.scrollWidth; }, []);
  const activityMap = new Map<string, number>();

  for (const s of sessions) {
    const key = toDateKey(s.date.toDate());
    activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
  }
  for (const s of gymSessions) {
    const key = toDateKey(s.date.toDate());
    activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
  }

  // Build cells: last 91 days aligned to Monday
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 90);
  const dow = startDate.getDay();
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

  const cells: { date: Date; count: number }[] = [];
  const cur = new Date(startDate);
  while (cur <= today) {
    cells.push({ date: new Date(cur), count: activityMap.get(toDateKey(cur)) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }

  const weeks: { date: Date; count: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  // Libellé de mois au-dessus d'une colonne quand le mois change
  const monthLabels = weeks.map((week, wi) => {
    const month = week[0]!.date.getMonth();
    const prev = wi > 0 ? weeks[wi - 1]![0]!.date.getMonth() : null;
    return month !== prev ? week[0]!.date.toLocaleDateString('fr-FR', { month: 'short' }) : null;
  });

  const DAY_LABELS = ['Lun', '', 'Mer', '', 'Ven', '', 'Dim'];
  // the grid starts on a Monday (91 to 97 cells): count the 90 days the title announces
  const since = new Date(today); since.setDate(today.getDate() - 89); since.setHours(0, 0, 0, 0);
  const activeDays = cells.filter((c) => c.count > 0 && c.date >= since).length;

  const cellColor = (count: number, isSelected: boolean) => {
    if (count === 0) return isSelected ? 'bg-muted-foreground/40' : 'bg-muted';
    if (count === 1) return isSelected ? 'bg-primary' : 'bg-primary/50';
    return isSelected ? 'bg-primary ring-1 ring-foreground/40' : 'bg-primary';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-2xl p-4"
    >
      <h3 className="text-sm font-semibold mb-0.5 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Activité (90 jours)
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {activeDays} jour{activeDays !== 1 ? 's' : ''} d'entraînement — chaque case est un jour, touche-la pour le détail
      </p>

      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="inline-flex gap-[3px]" onMouseLeave={() => setSelectedDay(null)}>
          {/* Libellés des jours (lignes) */}
          <div className="flex flex-col gap-[3px] pr-1">
            <div className="h-[14px]" />
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="h-3 flex items-center">
                <span className="text-[9px] leading-none text-muted-foreground w-6">{label}</span>
              </div>
            ))}
          </div>

          {/* Colonnes = semaines, avec le mois quand il change */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              <div className="relative h-[14px] w-3">
                {monthLabels[wi] && (
                  <span className="absolute left-0 top-0 text-[9px] leading-none text-muted-foreground whitespace-nowrap first-letter:uppercase">
                    {monthLabels[wi]}
                  </span>
                )}
              </div>
              {week.map((cell, di) => {
                const isSelected = selectedDay?.date.getTime() === cell.date.getTime();
                const dateLabel = frDate(cell.date, { weekday: 'long', day: 'numeric', month: 'long' });
                return (
                  <button
                    key={di}
                    type="button"
                    aria-label={`${dateLabel} : ${cell.count > 0 ? `${cell.count} séance${cell.count > 1 ? 's' : ''}` : 'repos'}`}
                    onMouseEnter={() => setSelectedDay(cell)}
                    onFocus={() => setSelectedDay(cell)}
                    onClick={() => setSelectedDay(cell)} // a tap fires mouseenter and focus first: a toggle cleared it
                    className={`w-3 h-3 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${cellColor(cell.count, isSelected)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Détail du jour sélectionné (emplacement réservé, pas de saut de mise en page) */}
      <p className="mt-2 min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {selectedDay && (
          <>
            <span className="font-medium text-foreground first-letter:uppercase inline-block">
              {frDate(selectedDay.date, { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {' — '}
            {selectedDay.count > 0
              ? `${selectedDay.count} séance${selectedDay.count > 1 ? 's' : ''}`
              : 'repos'}
          </>
        )}
      </p>

      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-muted" /> 0 séance</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/50" /> 1 séance</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary" /> 2 et +</span>
      </div>
    </motion.div>
  );
}

// ─── Weekly Chart (Reps + Volume toggle) ─────────────────────────────────────

function WeeklyChart({ sessions, gymSessions }: { sessions: Session[]; gymSessions: GymSession[] }) {
  const [mode, setMode] = useState<'reps' | 'volume'>('reps');
  const [selectedBar, setSelectedBar] = useState<number | null>(null);
  const navigate = useNavigate();
  const today = new Date();

  const buckets = Array.from({ length: 8 }, (_, i) => {
    const end = new Date(today);
    end.setDate(today.getDate() - (7 - i) * 7);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end, reps: 0, volume: 0 };
  });

  for (const s of sessions) {
    const d = s.date.toDate();
    const b = buckets.find((b) => d >= b.start && d <= b.end);
    if (b) b.reps += s.totalReps;
  }
  for (const s of gymSessions) {
    const d = s.date.toDate();
    const b = buckets.find((b) => d >= b.start && d <= b.end);
    if (b) b.volume += s.totalVolume;
  }

  const hasReps = buckets.some((b) => b.reps > 0);
  const hasVolume = buckets.some((b) => b.volume > 0);

  if (!hasReps && !hasVolume) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border rounded-2xl p-4"
      >
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Progression hebdomadaire
        </h3>
        <p className="text-xs text-muted-foreground text-center py-6">
          Pas encore de séance sur les 8 dernières semaines.
        </p>
        <button
          onClick={() => navigate('/session')}
          className="mx-auto block text-xs font-semibold text-primary min-h-[44px] px-4"
        >
          Lancer une séance
        </button>
      </motion.div>
    );
  }

  // Auto-switch to volume if no reps data
  const activeMode = mode === 'reps' && !hasReps ? 'volume' : mode === 'volume' && !hasVolume ? 'reps' : mode;
  const values = buckets.map((b) => (activeMode === 'reps' ? b.reps : Math.round(b.volume))); // whole kilos, like the recap
  const maxVal = Math.max(...values, 1);
  const BAR_HEIGHT = 72;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-2xl p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Progression hebdomadaire
        </h3>

        {/* Toggle reps / volume */}
        {hasReps && hasVolume && (
          <div className="flex gap-1 p-0.5 bg-muted rounded-lg" role="group" aria-label="Type de données">
            <button
              onClick={() => setMode('reps')}
              aria-pressed={activeMode === 'reps'}
              className={`flex items-center gap-1 px-3 max-[359px]:px-2 py-1.5 min-h-11 rounded-md text-xs font-medium transition-all active:scale-95 ${
                activeMode === 'reps' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Zap className="w-3 h-3 text-orange-500 max-[359px]:hidden" />
              Reps
            </button>
            <button
              onClick={() => setMode('volume')}
              aria-pressed={activeMode === 'volume'}
              className={`flex items-center gap-1 px-3 max-[359px]:px-2 py-1.5 min-h-11 rounded-md text-xs font-medium transition-all active:scale-95 ${
                activeMode === 'volume' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              <Dumbbell className="w-3 h-3 text-blue-500 max-[359px]:hidden" />
              Volume
            </button>
          </div>
        )}
      </div>

      <div
        className="flex items-end gap-1.5"
        style={{ height: `${BAR_HEIGHT + 4}px` }}
        onMouseLeave={() => setSelectedBar(null)}
      >
        {values.map((val, i) => {
          const isLast = i === buckets.length - 1;
          const barHeight = val > 0 ? Math.max(4, (val / maxVal) * BAR_HEIGHT) : 4;
          const isSelected = selectedBar === i;
          const weekLabel = isLast
            ? 'Cette semaine'
            : `Semaine du ${buckets[i]!.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}`;
          const valueLabel = `${val.toLocaleString('fr-FR')} ${activeMode === 'reps' ? 'reps' : 'kg'}`;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${weekLabel} : ${valueLabel}`}
              aria-pressed={isSelected}
              onMouseEnter={() => setSelectedBar(i)}
              onFocus={() => setSelectedBar(i)}
              onBlur={() => setSelectedBar((cur) => (cur === i ? null : cur))}
              onClick={() => setSelectedBar(i)}
              className="relative h-full flex-1 flex flex-col items-center justify-end rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isSelected && (
                <span
                  className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background shadow-sm ${
                    i === 0 ? 'left-0' : i === buckets.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                  }`}
                  style={{ bottom: `${Math.min(barHeight + 6, BAR_HEIGHT - 12)}px` }}
                >
                  {valueLabel}
                </span>
              )}
              <div
                className={`w-full rounded-t-sm transition-all ${
                  val > 0
                    ? isSelected
                      ? 'bg-primary'
                      : isLast
                        ? 'bg-primary/90'
                        : 'bg-primary/60'
                    : isSelected
                      ? 'bg-muted-foreground/40'
                      : 'bg-muted'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            </button>
          );
        })}
      </div>

      <div className="week-labels flex gap-1.5 mt-1.5">
        {buckets.map((b, i) => (
          // the last label sits on the right: a wider one (large font) overflows inwards, not off the card
          <div key={i} className={`flex-1 min-w-0 flex ${i === buckets.length - 1 ? 'justify-end' : 'justify-center'}`}>
            <span className="text-[10px] text-muted-foreground leading-none whitespace-nowrap">
              {i === buckets.length - 1 ? 'Auj.' : b.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}
            </span>
          </div>
        ))}
      </div>

      {/* Valeur totale de la semaine en cours */}
      {values[values.length - 1]! > 0 && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Cette semaine :{' '}
          <span className="font-semibold text-foreground">
            {activeMode === 'reps'
              ? `${values[values.length - 1]!.toLocaleString('fr-FR')} reps`
              : `${values[values.length - 1]!.toLocaleString('fr-FR')} kg soulevés`}
          </span>
        </p>
      )}
    </motion.div>
  );
}

// ─── Muscles travaillés (Hevy Pro, ici gratuit) ──────────────────────────────

const MUSCLE_PERIODS = [{ days: 7, label: '7 jours' }, { days: 30, label: '30 jours' }] as const;

function MuscleDistribution({ sessions, gymSessions }: { sessions: Session[]; gymSessions: GymSession[] }) {
  const [days, setDays] = useState<number>(7);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));
  const byGroup = setsByMuscle(gymSessions, sessions, since);
  const rows = MUSCLE_GROUPS.map((g) => ({ group: g, sets: byGroup[g] })).sort((a, b) => b.sets - a.sets);
  const max = Math.max(...rows.map((r) => r.sets));
  const fmtSets = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} série${n >= 2 ? 's' : ''}`;

  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Muscles travaillés
        </h3>
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg" role="group" aria-label="Période">
          {MUSCLE_PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              className={`px-3 min-h-11 rounded-md text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                days === p.days ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {max === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune séance sur cette période.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ group, sets }) => (
            <li key={group}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{group}</span>
                <span className="text-muted-foreground tabular-nums">{fmtSets(sets)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(sets / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground mt-4">
        Muscle principal : 1 série, secondaire : ½. Renfo : 1 série ≈ {REPS_PER_SET} reps.
      </p>
    </div>
  );
}

// ─── Récap du mois / de l'année (Hevy, Strava) ───────────────────────────────

function PeriodRecap({ sessions, gymSessions, firstDay }: { sessions: Session[]; gymSessions: GymSession[]; firstDay: number }) {
  const { toast } = useToast();
  const [kind, setKind] = useState<RecapKind>('month');
  const [offset, setOffset] = useState(0);
  const { from, to, label } = recapRange(kind, offset);
  // The whole period (a busy year exceeds the 200 sessions loaded for the page); recent data meanwhile
  const period = usePeriodHistory(from, to);
  const recap = period.loaded
    ? periodRecap(period.gymSessions, period.sessions, from, to)
    : periodRecap(gymSessions, sessions, from, to);
  const fmt = (n: number) => n.toLocaleString('fr-FR');
  const tiles = [
    { label: recap.sessions > 1 ? 'Séances' : 'Séance', value: fmt(recap.sessions) },
    { label: recap.trainingDays > 1 ? "Jours d'entraînement" : "Jour d'entraînement", value: fmt(recap.trainingDays) },
    // Same tiles as the shared card: no « 0 kg » volume (renfo only) nor « 0 record »
    recap.volume > 0 ? { label: 'Volume', value: `${fmt(recap.volume)} kg` } : { label: 'Répétitions', value: fmt(recap.reps) },
    ...(recap.records > 0 ? [{ label: recap.records > 1 ? 'Records' : 'Record', value: fmt(recap.records) }]
      : recap.volume > 0 ? [{ label: 'Répétitions', value: fmt(recap.reps) }] : []),
  ];

  return (
    <div className="bg-card border rounded-2xl p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Récap
        </h3>
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg" role="group" aria-label="Période du récap">
          {(['month', 'year'] as const).map((k) => (
            <button key={k} onClick={() => { setKind(k); setOffset(0); }} aria-pressed={kind === k}
              className={`px-3 min-h-11 rounded-md text-xs font-medium whitespace-nowrap ${kind === k ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}>
              {k === 'month' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => setOffset(offset - 1)} disabled={from.getTime() <= firstDay} aria-label={kind === 'month' ? 'Mois précédent' : 'Année précédente'}
          className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full hover:bg-muted disabled:opacity-30">
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
        <p className="font-semibold text-center" aria-live="polite">{label}</p>
        <button onClick={() => setOffset(offset + 1)} disabled={offset >= 0} aria-label={kind === 'month' ? 'Mois suivant' : 'Année suivante'}
          className="h-11 w-11 shrink-0 flex items-center justify-center rounded-full hover:bg-muted disabled:opacity-30">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {recap.sessions === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">Aucune séance sur cette période.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((t, i) => (
              // An odd last tile (renfo only: no volume nor records) takes the whole row, no empty cell
              <div key={t.label} className={`min-w-0 rounded-xl bg-muted/50 p-3${i === tiles.length - 1 && i % 2 === 0 ? ' col-span-2' : ''}`}>
                <p className="text-xl font-bold hyphens-auto break-words">{t.value}</p>
                <p className="text-xs text-muted-foreground hyphens-auto break-words">{t.label}</p>
              </div>
            ))}
          </div>
          {recap.topMuscles[0] && (
            <p className="text-sm">
              Muscle le plus travaillé&nbsp;: <span className="font-semibold">{recap.topMuscles[0].group}</span>
              {' '}<span className="text-muted-foreground whitespace-nowrap">({plural(Math.round(recap.topMuscles[0].sets), 'série')})</span>
            </p>
          )}
          <button
            onClick={() => void shareSessionCard(recapCard(recap, label, from)).catch(() => toast({ title: 'Partage impossible', description: "L'image n'a pas pu être créée.", variant: 'destructive' }))}
            className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl border text-sm font-medium hover:bg-muted"
          >
            <Share2 className="w-4 h-4" /> Partager mon récap
          </button>
        </>
      )}
    </div>
  );
}

// ─── Habitudes : créneau horaire des séances (renfo + muscu) ─────────────────

const SLOTS = [
  { label: 'Matin', hours: 'avant 12 h', icon: Sunrise, match: (h: number) => h >= 5 && h < 12 },
  { label: 'Après-midi', hours: '12 h – 18 h', icon: Sun, match: (h: number) => h >= 12 && h < 18 },
  { label: 'Soir', hours: 'après 18 h', icon: Moon, match: (h: number) => h >= 18 || h < 5 },
];

function TrainingHabits({ sessions, gymSessions }: { sessions: Session[]; gymSessions: GymSession[] }) {
  const hours = [...sessions, ...gymSessions].map((s) => s.date.toDate().getHours());
  if (hours.length === 0) return null;
  const counts = SLOTS.map((slot) => hours.filter(slot.match).length);
  const max = Math.max(...counts);
  const top = counts.indexOf(max);
  const tied = counts.filter((c) => c === max).length > 1; // indexOf picks the first slot of a tie

  return (
    <div className="bg-card border rounded-2xl p-4">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Habitudes d'entraînement
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        {tied
          ? "Pas de créneau dominant pour l'instant."
          : `Tu t'entraînes surtout ${top === 0 ? 'le matin' : top === 1 ? "l'après-midi" : 'le soir'}.`}
      </p>
      <div className="space-y-4">
        {SLOTS.map(({ label, hours: range, icon: Icon }, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">{label} <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">· {range}</span></span>
                <span className="text-muted-foreground whitespace-nowrap">{counts[i]} séance{counts[i]! > 1 ? 's' : ''}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${(counts[i]! / hours.length) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const HISTORY_PAGE = 200;

export default function Statistics() {
  const { user, stats } = useUserStore();
  const navigate = useNavigate();
  const { weeklyGoal, streakMode } = useSettingsStore();
  const { sessions, gymSessions, loading: historyLoading } = useSessionHistory(HISTORY_PAGE);
  // Heatmap (up to 96 days with the Monday alignment), weekly chart and muscles by date range: challenge
  // validations (one session each) can push these days out of the latest 200; recent data meanwhile
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const recentFrom = new Date(today); recentFrom.setDate(today.getDate() - 96);
  const recentTo = new Date(today); recentTo.setDate(today.getDate() + 1);
  const recent = usePeriodHistory(recentFrom, recentTo);
  const chartSessions = recent.loaded ? recent.sessions : sessions;
  const chartGymSessions = recent.loaded ? recent.gymSessions : gymSessions;

  // Séances de la semaine en cours (lundi → dimanche), from this render's day: the resident app outlives midnight
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const thisWeekCount = [...sessions, ...gymSessions].filter((s) => s.date.toDate() >= monday).length;

  if (!user) return null;
  const isEmpty = !historyLoading && sessions.length === 0 && gymSessions.length === 0;
  const weeklyMode = streakMode === 'weekly';
  const streakNow = stats ? (weeklyMode ? stats.weeklyStreak ?? 0 : stats.currentStreak) : 0;
  const streakBest = stats ? (weeklyMode ? stats.longestWeeklyStreak ?? 0 : stats.longestStreak) : 0;
  // The recap's back arrow stops at the first period with data: the account's creation, or an older imported
  // session. A full page may not reach the oldest session: no stop then
  const firstDay = sessions.length < HISTORY_PAGE && gymSessions.length < HISTORY_PAGE
    ? Math.min(user.createdAt?.toDate().getTime() ?? Infinity, ...[...sessions, ...gymSessions].map((s) => s.date.toDate().getTime()))
    : -Infinity;
  // Recomputed from the sessions at each sign-in: the user document's counters lag behind when the app is closed
  // right after an edit (its recalculation runs in the background), and the favourites below come from stats too
  const totals = stats ?? user;
  const streakUnit = (n: number) => (weeklyMode ? (n > 1 ? 'semaines' : 'semaine') : (n > 1 ? 'jours' : 'jour'));

  return (
    <PageLayout title="STATISTIQUES">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Lien historique */}
        <button
          onClick={() => navigate('/history')}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border bg-card hover:bg-muted active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Historique des séances</p>
              <p className="text-xs text-muted-foreground">Renforcement &amp; Musculation</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        {/* Objectif hebdomadaire */}
        {weeklyGoal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-2xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Objectif cette semaine</span>
              </div>
              <span className="text-sm font-bold whitespace-nowrap">
                {historyLoading ? '–' : Math.min(thisWeekCount, weeklyGoal)}/{weeklyGoal} séances
              </span>
            </div>
            {/* Barre de progression */}
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${thisWeekCount >= weeklyGoal ? 'bg-green-500' : 'bg-primary'}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((thisWeekCount / weeklyGoal) * 100, 100)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            {historyLoading ? (
              <p className="text-xs min-h-4" /> // the sessions are not counted yet: same height, no « Encore 3 séances »
            ) : thisWeekCount >= weeklyGoal ? (
              <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                🎉 Objectif atteint ! Bravo !
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Encore {weeklyGoal - thisWeekCount} séance{weeklyGoal - thisWeekCount > 1 ? 's' : ''} pour atteindre ton objectif
              </p>
            )}
          </motion.div>
        )}

        {/* Alerte Profil Incomplet */}
        {(!user.weight || !user.height || !user.gender) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400 p-3 rounded-2xl flex gap-3 text-sm items-start"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Profil incomplet</p>
              <p className="opacity-90 text-xs mt-0.5">
                Renseigne ton poids, ta taille et ton sexe pour un calcul précis des calories.
              </p>
              <button
                onClick={() => navigate('/profil')}
                className="mt-2 inline-flex items-center min-h-[40px] px-3 -ml-3 rounded-lg text-xs font-semibold underline underline-offset-2 active:scale-95 transition-transform"
              >
                Mettre à jour mon profil
              </button>
            </div>
          </motion.div>
        )}

        {isEmpty ? (
          <div className="bg-card border rounded-2xl p-6 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <p className="font-semibold">Tes stats arrivent après ta première séance</p>
            <p className="text-sm text-muted-foreground">
              Calories, séries, records et courbes de progression se remplissent au fil de tes entraînements.
            </p>
            <button
              onClick={() => navigate('/templates')}
              className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-transform"
            >
              Lancer ma première séance <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
        <>
        {/* Renfo totals (calories, reps, sessions, average): hidden for a muscu-only user rather than four zeros */}
        {totals.totalSessions > 0 && (<>
        {/* Résumé Calories */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-card border rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Flame className="w-24 h-24 text-primary" />
          </div>

          <div className="relative z-10">
            <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wider mb-1">
              Calories brûlées
            </h2>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tracking-tight">
                {(totals.totalCalories || 0).toLocaleString('fr-FR')}
              </span>
              <span className="text-primary font-medium">kcal</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Estimation basée sur tes répétitions en renfo (la muscu n'est pas comptée)
            </p>
          </div>
        </motion.div>

        {/* Grille de stats secondaires */}
        {/* Volume */}
        <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2"
            >
              <div className="bg-red-500/10 p-2 rounded-full">
                <Dumbbell className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold block">{totals.totalReps.toLocaleString('fr-FR')}</span>
                <span className="text-xs text-muted-foreground uppercase">Reps renfo</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-card border rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2"
            >
              <div className="bg-blue-500/10 p-2 rounded-full">
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-0.5">
                <span className="text-2xl font-bold block">{totals.totalSessions}</span>
                <span className="text-xs text-muted-foreground uppercase">Séances renfo</span>
              </div>
            </motion.div>
        </div>

        {/* Moyenne Calories / Séance (Carte dédiée) */}
        <motion.div
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="bg-card border rounded-2xl p-4 flex items-center justify-between"
        >
             <div className="flex items-center gap-4">
                 <div className="bg-primary/10 p-3 rounded-full">
                    <Zap className="w-6 h-6 text-primary" />
                 </div>
                 <div className="text-left">
                     <p className="text-sm font-medium text-muted-foreground">Moyenne par séance renfo</p>
                     <p className="text-2xl font-bold">
                        {((totals.totalCalories || 0) / (totals.totalSessions || 1)).toFixed(0)}
                        <span className="text-sm font-medium text-primary ml-1">kcal</span>
                     </p>
                 </div>
             </div>
        </motion.div>
        </>)}

        {/* Top Exercices & Détails */}
        {stats?.exercisesDistribution && stats.exercisesDistribution.length > 0 && (
          <div className="space-y-4">
             {/* Pub avant Exercices Favoris */}
            <AdSpace
              adId="ca-app-pub-1431137074985627/2893707245"
              slotId={ADS_CONFIG.ADSENSE.SLOTS.STATISTICS_TOP}
            />

            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Exercices favoris
            </h3>

            {/* Top 3 Cards */}
            <div className="grid grid-cols-3 gap-3">
              {stats.exercisesDistribution.slice(0, 3).map((ex, i) => (
                <div
                  key={ex.name}
                  className="bg-card border rounded-xl p-3 flex flex-col items-center gap-2 text-center relative overflow-hidden"
                >
                  <div className={`absolute top-0 left-0 px-2 py-0.5 text-[10px] font-bold rounded-br-lg ${
                    i === 0 ? 'bg-yellow-500/20 text-yellow-800 dark:text-yellow-400' :
                    i === 1 ? 'bg-slate-300/20 text-slate-600 dark:text-slate-400' :
                    'bg-orange-300/20 text-orange-700 dark:text-orange-400'
                  }`}>
                    #{i + 1}
                  </div>
                  <span className="text-2xl mt-4">{ex.emoji}</span>
                  <div className="space-y-0.5 w-full">
                    <p className="text-xs font-medium line-clamp-2 hyphens-auto break-words px-1" title={ex.name}>
                      {ex.name}
                    </p>
                    <p className="text-lg font-bold">{formatNumber(ex.totalReps)}</p>
                    <p className="text-xs text-muted-foreground">{ex.totalReps > 1 ? 'reps' : 'rep'}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Liste Détaillée */}
            {/* A table: the number columns take their widest value (they had a fixed 3rem that squeezed the names
                to « Tr… » with a large font) and stay aligned row to row */}
            <div className="bg-card border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b text-xs text-muted-foreground">
                    <th scope="col" className="p-3 pr-2 text-left font-medium">Exercice</th>
                    <th scope="col" className="py-3 text-right font-medium">Reps</th>
                    <th scope="col" className="py-3 pl-4 pr-3 text-right font-medium">Kcal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.exercisesDistribution.map((ex) => (
                    <tr key={ex.name} className="hover:bg-muted/50 transition-colors">
                      <td className="w-full p-3 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg shrink-0">{ex.emoji}</span>
                          {/* anywhere, not break-word: lets the table column shrink below the longest word */}
                          <span className="line-clamp-2 hyphens-auto [overflow-wrap:anywhere] font-medium">{ex.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-bold tabular-nums whitespace-nowrap">{formatNumber(ex.totalReps)}</td>
                      <td className="py-3 pl-4 pr-3 text-right text-primary tabular-nums whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          {formatNumber(ex.totalCalories)}
                          <Flame className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Séries (Streaks): « – » until the stats arrive, so the charts below do not jump down */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-2 right-2 opacity-10">
                        <Flame className="w-12 h-12" />
                    </div>
                     <span className="text-xs text-muted-foreground uppercase font-semibold">Série actuelle</span>
                     <div className="mt-2">
                        <span className="text-3xl font-bold">{stats ? streakNow : '–'}</span>
                        <span className="text-sm text-muted-foreground ml-1">{stats && streakUnit(streakNow)}</span>
                     </div>
                     <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {weeklyMode
                          ? `Chaque semaine à ${Math.max(1, weeklyGoal)} séance${weeklyGoal > 1 ? 's' : ''} prolonge ta série.`
                          : stats?.jokerPending
                            ? "Joker utilisé hier : une séance aujourd'hui et ta série continue."
                            : '1 jour de repos par semaine ne casse pas ta série.'}
                     </p>
                </div>
                <div className="bg-card border rounded-2xl p-4 flex flex-col justify-between overflow-hidden relative">
                    <div className="absolute top-2 right-2 opacity-10">
                        <Trophy className="w-12 h-12" />
                    </div>
                     <span className="text-xs text-muted-foreground uppercase font-semibold">Meilleure série</span>
                     <div className="mt-2">
                        <span className="text-3xl font-bold">{stats ? streakBest : '–'}</span>
                        <span className="text-sm text-muted-foreground ml-1">{stats && streakUnit(streakBest)}</span>
                     </div>
                </div>
            </div>

        {/* Habitudes (Distribution) */}
        {/* Habitudes (Distribution) */}

        {/* Graphiques historiques */}
        {historyLoading ? (
          <div className="bg-card border rounded-2xl p-4 flex justify-center py-10">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <>
            <ActivityCalendar sessions={chartSessions} gymSessions={chartGymSessions} />
            <WeeklyChart sessions={chartSessions} gymSessions={chartGymSessions} />
            <MuscleDistribution sessions={chartSessions} gymSessions={chartGymSessions} />
            <PeriodRecap sessions={sessions} gymSessions={gymSessions} firstDay={firstDay} />
          </>
        )}

        {/* Pub avant Habitudes (Carte séparée) */}
        <AdSpace
          adId="ca-app-pub-1431137074985627/2893707245"
          slotId={ADS_CONFIG.ADSENSE.SLOTS.STATISTICS_BOTTOM}
        />

        <TrainingHabits sessions={sessions} gymSessions={gymSessions} />

        </>
        )}

        {/* Note informative */}
        <details className="bg-muted/50 p-4 rounded-2xl text-xs text-muted-foreground">
          <summary className="cursor-pointer font-semibold min-h-[44px] flex items-center">
            Comment sont calculées les calories&nbsp;?
          </summary>
          <div className="mt-3">
            <p>
              Le calcul des calories est personnalisé selon ton profil (poids, taille, sexe) et l'intensité (MET) de chaque exercice.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 ml-1">
              <li>Formule&nbsp;: ACSM (American College of Sports Medicine)</li>
              <li>Facteurs&nbsp;: Poids, Taille, Sexe, MET, Temps sous tension</li>
            </ul>

            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="font-semibold mb-2">Pour 10 reps (homme de 75&nbsp;kg, 1,75&nbsp;m)&nbsp;:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {KCAL_EXAMPLES.map(({ label, kcal }) => (
                  <div key={label} className="flex justify-between">
                    <span>{label}</span>
                    <span className="text-primary font-medium">~{kcal.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}&nbsp;kcal</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>

    </PageLayout>
  );
}
