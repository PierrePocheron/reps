import type { GymSessionExercise, PlannedSet, SetType } from '@/firebase/types';

/** Séance lue dans un export Strong ou Hevy (#61). */
export interface ImportedSession { date: Date; duration: number; exercises: GymSessionExercise[]; title?: string; note?: string }
export type ResolveExercise = (name: string) => { exerciseId: string; name: string; emoji: string };

/** CSV RFC 4180 : guillemets, "" échappés, retours à la ligne dans un champ ; séparateur , ou ; (détecté). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const firstLine = src.slice(0, src.indexOf('\n') >>> 0);
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const num = (s: string | undefined) => {
  const n = Number((s ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
/** « 1h 5m », « 65m », « 45s », « 3900 » (secondes) → secondes. */
const durationOf = (s: string) => {
  const parts = [...s.matchAll(/(\d+)\s*([hms])/g)];
  if (parts.length === 0) return Math.round(num(s));
  return parts.reduce((t, [, n, u]) => t + Number(n) * (u === 'h' ? 3600 : u === 'm' ? 60 : 1), 0);
};
/** Colonne de charges en livres : Hevy « weight_lbs », Strong « Weight (lbs) ». */
export const POUNDS_HEADER = /weight_lbs|weight \(lbs?\)/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** « 2026-10-02 18:05:00 » (Strong) ou « 2 Oct 2026, 18:05 » (Hevy), en heure locale. */
const dateOf = (s: string): Date | null => {
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +(m[6] ?? 0));
  m = s.match(/(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? (\d{1,2}):(\d{2})/);
  if (m) {
    const month = MONTHS.indexOf(m[2]!.toLowerCase());
    if (month >= 0) return new Date(+m[3]!, month, +m[1]!, +m[4]!, +m[5]!);
  }
  return null;
};
const typeOf = (s: string): SetType | undefined => {
  const t = s.trim().toLowerCase();
  if (t === 'w' || t === 'warmup') return 'warmup';
  if (t === 'd' || t === 'dropset' || t === 'drop') return 'drop';
  if (t === 'f' || t === 'failure') return 'failure';
  return undefined;
};

/**
 * Séances d'un export Strong (et de l'export REPS, même format) ou Hevy, du plus ancien au plus récent.
 * Lignes « Renforcement » de l'export REPS ignorées (pas des séances muscu). Charges en kg (livres converties).
 */
export function parseWorkoutsCsv(text: string, resolve: ResolveExercise): ImportedSession[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const head = header.map((h) => h.trim().toLowerCase());
  // current Strong exports put the unit in the header: « Weight (kg) », « Duration (sec) »
  const col = (name: string) => head.findIndex((h) => h === name.toLowerCase() || h.startsWith(`${name.toLowerCase()} (`));
  const hevy = col('exercise_title') >= 0;
  const c = hevy
    ? { start: col('start_time'), end: col('end_time'), workout: col('title'), exercise: col('exercise_title'), type: col('set_type'),
        weight: col('weight_kg') >= 0 ? col('weight_kg') : col('weight_lbs'), reps: col('reps'), seconds: col('duration_seconds'), note: col('exercise_notes'), rpe: col('rpe'), duration: -1, workoutNote: col('description') }
    : { start: col('Date'), end: -1, workout: col('Workout Name'), exercise: col('Exercise Name'), type: col('Set Order'),
        weight: col('Weight'), reps: col('Reps'), seconds: col('Seconds'), note: col('Notes'), rpe: col('RPE'), duration: col('Duration'), workoutNote: col('Workout Notes') };
  if (c.start < 0 || c.exercise < 0) return [];
  const lbs = POUNDS_HEADER.test(head[c.weight] ?? '');
  const kg = (w: number) => (lbs ? Math.round(w * 0.45359237 * 10) / 10 : w);

  const sessions = new Map<string, ImportedSession>();
  for (const r of rows) {
    const date = dateOf(r[c.start] ?? '');
    const exName = (r[c.exercise] ?? '').trim();
    if (!date || !exName || (r[c.workout] ?? '') === 'Renforcement') continue;
    const key = `${r[c.start]}|${r[c.workout] ?? ''}`;
    let s = sessions.get(key);
    if (!s) {
      const end = hevy ? dateOf(r[c.end] ?? '') : null;
      const duration = end ? Math.max(0, Math.round((end.getTime() - date.getTime()) / 1000))
        : c.duration >= 0 ? durationOf(r[c.duration] ?? '') : 0;
      s = { date, duration, exercises: [] };
      const title = (r[c.workout] ?? '').trim(), note = (r[c.workoutNote] ?? '').trim();
      if (title && title !== 'Musculation') s.title = title.slice(0, 60); // « Musculation » : titre par défaut de l'export REPS
      if (note) s.note = note.slice(0, 300);
      sessions.set(key, s);
    }
    const resolved = resolve(exName);
    let ex = s.exercises.find((e) => e.exerciseId === resolved.exerciseId);
    if (!ex) { ex = { ...resolved, sets: [] }; s.exercises.push(ex); }
    const seconds = num(r[c.seconds]), reps = num(r[c.reps]);
    const timed = reps === 0 && seconds > 0; // exercice en durée (#55)
    if (timed) ex.timed = true;
    const set: PlannedSet = { reps: timed ? seconds : reps, weight: kg(num(r[c.weight])), completed: true };
    const type = typeOf(r[c.type] ?? ''), rpe = num(r[c.rpe]);
    if (type) set.type = type;
    if (rpe) set.rpe = rpe;
    const note = (r[c.note] ?? '').trim();
    // two source names on one exercise (synonyms): keep every note, not just the first
    if (note && !ex.note?.split(' · ').includes(note)) ex.note = ex.note ? `${ex.note} · ${note}` : note;
    ex.sets.push(set);
  }
  return [...sessions.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Phrase de l'aperçu d'import (séances du plus ancien au plus récent). */
export function importSummary(sessions: { date: Date }[], known: number, exercises: number, pounds: boolean): string {
  const n = sessions.length, day = (d: Date) => d.toLocaleDateString('fr-FR');
  const first = day(sessions[0]!.date), last = day(sessions[n - 1]!.date);
  return `${n} séance${n > 1 ? 's' : ''} du ${first}${first === last ? '' : ` au ${last}`} · ${known}/${exercises} exercices reconnus`
    + ` (les autres deviennent des exercices perso) · charges ${pounds ? 'converties des livres en kg' : 'lues en kg'}.`;
}

/** Sans doublon : une séance qui démarre à moins d'une minute d'une séance existante est déjà là. */
export const newSessionsOnly = (imported: ImportedSession[], existing: Date[]) =>
  imported.filter((s) => !existing.some((d) => Math.abs(d.getTime() - s.date.getTime()) < 60_000));

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// same words in any order, plural-insensitive: Strong / Hevy « Bench Press (Barbell) » = « Barbell bench press »
const wordBag = (s: string) => normalize(s).split(' ').map((w) => w.replace(/s$/, '')).sort().join(' ');

// Strong / Hevy names of the REPS base exercises: the imported history goes on in the exercise picked in REPS.
// Only names of the same movement: a distinct variant (seated calf raise, rope pushdown…) keeps its own exercise,
// otherwise two variants done in one workout would merge into one
const BASE_ALIASES: Record<string, string[]> = {
  bench_press: ['Bench Press (Barbell)'],
  incline_bench: ['Incline Bench Press (Barbell)'],
  dumbbell_fly: ['Chest Fly (Dumbbell)', 'Dumbbell Fly'],
  cable_fly: ['Cable Crossover', 'Cable Fly Crossovers'],
  chest_dips: ['Chest Dip', 'Chest Dip (Weighted)'],
  deadlift: ['Deadlift (Barbell)'],
  barbell_row: ['Bent Over Row (Barbell)'],
  dumbbell_row: ['Dumbbell Row', 'Bent Over One Arm Row (Dumbbell)'],
  lat_pulldown: ['Lat Pulldown (Cable)'],
  cable_row: ['Seated Row (Cable)', 'Seated Cable Row - V Grip (Cable)'],
  weighted_pullups: ['Pull Up (Weighted)', 'Weighted Pull Up'],
  barbell_squat: ['Squat (Barbell)', 'Back Squat (Barbell)'],
  leg_press: ['Leg Press', 'Leg Press (Machine)'],
  leg_curl: ['Lying Leg Curl (Machine)'],
  leg_extension: ['Leg Extension (Machine)'],
  romanian_deadlift: ['Romanian Deadlift (Barbell)'],
  weighted_hip_thrust: ['Hip Thrust (Barbell)'],
  machine_calf: ['Calf Raise (Machine)', 'Standing Calf Raise (Machine)'],
  overhead_press: ['Overhead Press (Barbell)'],
  db_lateral_raise: ['Lateral Raise (Dumbbell)'],
  front_raise: ['Front Raise (Dumbbell)'],
  face_pull: ['Face Pull (Cable)'],
  barbell_curl: ['Bicep Curl (Barbell)'],
  dumbbell_curl: ['Bicep Curl (Dumbbell)'],
  hammer_curl: ['Hammer Curl (Dumbbell)'],
  skull_crusher: ['Skullcrusher (Barbell)', 'Lying Triceps Extension (Barbell)'],
  tricep_pushdown: ['Triceps Pushdown (Cable - Straight Bar)', 'Triceps Pushdown'],
  overhead_ext: ['Overhead Triceps Extension (Cable)', 'Triceps Extension (Cable)'],
  crunch_machine: ['Crunch (Machine)'],
};
const aliasOf = new Map(Object.entries(BASE_ALIASES).flatMap(([id, names]) => names.map((n) => [wordBag(n), id] as const)));

/**
 * Reconnaît un exercice par son nom : nom exact FR ou EN (sans accents ni casse), nom Strong / Hevy d'un exercice de
 * base, puis mêmes mots dans n'importe quel ordre ; sinon exercice personnalisé stable. À nom égal, le premier de `known` l'emporte (exercices REPS avant la bibliothèque).
 */
export function exerciseResolver(known: { id: string; name: string; emoji: string }[]): ResolveExercise {
  const byId = new Map(known.map((k) => [k.id, k] as const));
  const byName = new Map<string, (typeof known)[number]>(), byBag = new Map<string, (typeof known)[number]>();
  for (const k of known) {
    if (!byName.has(normalize(k.name))) byName.set(normalize(k.name), k);
    if (!byBag.has(wordBag(k.name))) byBag.set(wordBag(k.name), k);
  }
  return (name) => {
    // exact name first: a REPS export re-imported keeps its library exercises (« Barbell bench press »)
    const hit = byName.get(normalize(name)) ?? byId.get(aliasOf.get(wordBag(name)) ?? '') ?? byBag.get(wordBag(name));
    return hit ? { exerciseId: hit.id, name: hit.name, emoji: hit.emoji } : { exerciseId: `import_${normalize(name).replace(/ /g, '_')}`, name, emoji: '🏋️' };
  };
}
