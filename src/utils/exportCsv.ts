import type { GymSession, Session } from '@/firebase/types';

// Colonnes de l'export Strong (en-têtes anglais) : format importable par Hevy et la plupart des carnets
const HEADER = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE'];

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const duration = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;

/** Une ligne par série validée (muscu) ou par exercice (renfo : reps du jour, sans charge), du plus ancien au plus récent. */
export function sessionsToCsv(gymSessions: GymSession[], sessions: Session[]): string {
  const rows: { at: Date; cells: (string | number)[] }[] = [];
  for (const s of gymSessions) {
    const at = s.date.toDate();
    for (const ex of s.exercises) {
      ex.sets.filter((set) => set.completed).forEach((set, i) => rows.push({
        at, cells: [stamp(at), 'Musculation', duration(s.duration), ex.name, i + 1, set.actualWeight ?? set.weight, set.actualReps ?? set.reps, '', '', i === 0 ? ex.note ?? '' : '', '', set.rpe ?? ''],
      }));
    }
  }
  for (const s of sessions) {
    const at = s.date.toDate();
    for (const ex of s.exercises) {
      rows.push({ at, cells: [stamp(at), 'Renforcement', duration(s.duration), ex.name, 1, 0, ex.reps, '', '', '', '', ''] });
    }
  }
  rows.sort((a, b) => a.at.getTime() - b.at.getTime());
  return [HEADER, ...rows.map((r) => r.cells)].map((r) => r.map(cell).join(',')).join('\n');
}
