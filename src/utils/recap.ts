import type { GymSession, Session } from '@/firebase/types';
import { plural } from '@/utils/formatters';
import { isTimed, isWorkSet } from '@/utils/records';
import { MUSCLE_GROUPS, setsByMuscle, type MuscleGroup } from '@/utils/muscles';
import type { SessionCard } from '@/utils/shareCard';

export type RecapKind = 'month' | 'year';

/** Bornes [début, fin[ du mois ou de l'année décalé de `offset` (0 = en cours, -1 = précédent). */
export function recapRange(kind: RecapKind, offset: number, now = new Date()): { from: Date; to: Date; label: string } {
  if (kind === 'year') {
    const y = now.getFullYear() + offset;
    return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1), label: String(y) };
  }
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const label = from.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return { from, to, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

export interface Recap {
  sessions: number;
  trainingDays: number;
  volume: number;       // kg soulevés (séries de travail)
  reps: number;         // renfo + muscu
  records: number;
  topMuscles: { group: MuscleGroup; sets: number }[];
}

/** Récap d'une période (Hevy / Strava) : séances, jours, volume, reps, records, muscles les plus travaillés. */
export function periodRecap(gym: GymSession[], renfo: Session[], from: Date, to: Date): Recap {
  const inRange = (d: Date) => d >= from && d < to;
  const g = gym.filter((s) => inRange(s.date.toDate()));
  const r = renfo.filter((s) => inRange(s.date.toDate()));
  let volume = 0, reps = 0, records = 0;
  for (const s of g) for (const ex of s.exercises) for (const set of ex.sets.filter(isWorkSet)) {
    if (set.isRecord) records++; // a best duration is a record too
    if (isTimed(ex)) continue;   // seconds are neither reps nor kg × reps (same rule as the session's totalVolume)
    const w = set.actualWeight ?? set.weight, n = set.actualReps ?? set.reps;
    volume += w * n; reps += n;
  }
  for (const s of r) reps += s.totalReps;
  const days = new Set([...g, ...r].map((s) => s.date.toDate().toDateString()));
  const muscles = setsByMuscle(g, r, from, to);
  const topMuscles = MUSCLE_GROUPS.map((group) => ({ group, sets: muscles[group] }))
    .filter((m) => m.sets > 0).sort((a, b) => b.sets - a.sets).slice(0, 3);
  return { sessions: g.length + r.length, trainingDays: days.size, volume: Math.round(volume), reps, records, topMuscles };
}

const num = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

/** Carte partageable du récap (même rendu que la carte de séance). */
export function recapCard(recap: Recap, label: string, from: Date): SessionCard {
  const stats = [
    { label: recap.sessions > 1 ? 'Séances' : 'Séance', value: String(recap.sessions) },
    { label: recap.trainingDays > 1 ? 'Jours' : 'Jour', value: String(recap.trainingDays) },
    recap.volume > 0 ? { label: 'Volume', value: `${num(recap.volume)} kg` } : { label: 'Reps', value: num(recap.reps) },
  ];
  if (recap.records > 0) stats.push({ label: recap.records > 1 ? 'Records' : 'Record', value: `🏆 ${recap.records}` });
  const lines = recap.topMuscles.map((m, i) => ({ name: `${['🥇', '🥈', '🥉'][i]} ${m.group}`, detail: plural(Math.round(m.sets), 'série') })); // whole sets on screen
  if (recap.volume > 0) lines.push({ name: 'Répétitions', detail: num(recap.reps) });
  return { title: 'Mon récap', subtitle: label, date: from, stats, lines, more: 0 };
}
