import { describe, it, expect } from 'vitest';
import { parseCsv, parseWorkoutsCsv, newSessionsOnly, exerciseResolver, importSummary, POUNDS_HEADER } from '../importCsv';
import { sessionsToCsv } from '../exportCsv';
import type { GymSession } from '@/firebase/types';
import { MUSCULATION_EXERCISES } from '@/utils/constants';
import { isTimed } from '@/utils/records';

const resolve = exerciseResolver([{ id: 'bench_press', name: 'Développé couché', emoji: '🏋️' }, { id: 'lib_0025', name: 'Barbell Bench Press', emoji: '💪' }]);

describe('parseCsv', () => {
  it('guillemets, "" échappés, BOM, CRLF et séparateur ;', () => {
    expect(parseCsv('\uFEFFa,b\r\n"x, ""y""",2\r\n')).toEqual([['a', 'b'], ['x, "y"', '2']]);
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});

describe('parseWorkoutsCsv', () => {
  it('export Strong : séances regroupées, échauffement, RPE, durée, exercice reconnu (accents/casse) ou personnalisé', () => {
    const csv = [
      'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
      '2026-10-02 18:05:00,Push,1h 5m,developpe couche,W,20,12,,,,,',
      '2026-10-02 18:05:00,Push,1h 5m,developpe couche,1,62.5,8,,,"banc 3",,8.5',
      '2026-10-02 18:05:00,Push,1h 5m,Gainage,1,0,0,,60,,,',
      '2026-10-01 07:00:00,Renforcement,0h 10m,Pompes,1,0,40,,,,,',
    ].join('\n');
    const [s] = parseWorkoutsCsv(csv, resolve);
    expect(parseWorkoutsCsv(csv, resolve)).toHaveLength(1); // ligne « Renforcement » de l'export REPS ignorée
    expect(s!.date).toEqual(new Date(2026, 9, 2, 18, 5));
    expect(s!.duration).toBe(3900);
    expect(s!.title).toBe('Push'); // titre de séance (#64)
    expect(s!.exercises[0]).toMatchObject({ exerciseId: 'bench_press', name: 'Développé couché', note: 'banc 3',
      sets: [{ weight: 20, reps: 12, completed: true, type: 'warmup' }, { weight: 62.5, reps: 8, completed: true, rpe: 8.5 }] });
    expect(s!.exercises[1]).toMatchObject({ exerciseId: 'import_gainage', timed: true, sets: [{ reps: 60, weight: 0 }] });
  });

  it('export Strong actuel : unités dans les en-têtes (« Weight (kg) », « Duration (sec) »)', () => {
    const csv = [
      '"Workout #";"Date";"Workout Name";"Duration (sec)";"Exercise Name";"Set Order";"Weight (kg)";"Reps";"RPE";"Distance (meters)";"Seconds";"Notes";"Workout Notes"',
      '"1";"2026-10-02 18:00:00";"Push";"3600";"Bench Press (Barbell)";"1";"82.5";"8";"";"";"";"";""',
      '"1";"2026-10-02 18:00:00";"Push";"3600";"Bench Press (Barbell)";"2";"82.5";"7";"9";"";"";"";""',
    ].join('\n');
    const [s] = parseWorkoutsCsv(csv, resolve);
    expect(s).toMatchObject({ duration: 3600, exercises: [{ exerciseId: 'bench_press', sets: [{ weight: 82.5, reps: 8 }, { weight: 82.5, reps: 7, rpe: 9 }] }] });
  });

  it('export Strong en livres : « Weight (lbs) » converti en kg', () => {
    const csv = [
      'Workout #,Date,Workout Name,Duration (sec),Exercise Name,Set Order,Weight (lbs),Reps,RPE,Distance (miles),Seconds,Notes,Workout Notes',
      '1,2026-10-02 18:00:00,Push,3600,Barbell Bench Press,1,225,5,,,,,',
    ].join('\n');
    expect(parseWorkoutsCsv(csv, resolve)[0]!.exercises[0]!.sets[0]!.weight).toBe(102.1);
  });

  it('export Hevy : début / fin, types, poids en kg', () => {
    const csv = [
      '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
      '"Pull","3 Oct 2026, 09:00","3 Oct 2026, 10:15","","Bench Press (Barbell)","","","0","normal","80","5","","",""',
      '"Pull","3 Oct 2026, 09:00","3 Oct 2026, 10:15","","Bench Press (Barbell)","","","1","failure","81.25","4","","","9"',
    ].join('\n');
    const [s] = parseWorkoutsCsv(csv, resolve);
    expect(s).toMatchObject({ date: new Date(2026, 9, 3, 9, 0), duration: 4500,
      exercises: [{ exerciseId: 'bench_press', sets: [{ weight: 80, reps: 5 }, { weight: 81.25, reps: 4, type: 'failure', rpe: 9 }] }] });
  });

  it('export Hevy : une séance intitulée « Renforcement » est importée (seul l’export REPS a des lignes renfo)', () => {
    const csv = [
      '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
      '"Renforcement","3 Oct 2026, 09:00","3 Oct 2026, 10:00","","Bench Press (Barbell)","","","0","normal","60","8","","",""',
    ].join('\n');
    expect(parseWorkoutsCsv(csv, resolve)).toMatchObject([{ title: 'Renforcement', exercises: [{ sets: [{ weight: 60, reps: 8 }] }] }]);
  });

  it('export Hevy en livres : charges converties en kg (pas lues comme 0)', () => {
    const csv = [
      '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_lbs","reps","distance_miles","duration_seconds","rpe"',
      '"Push","3 Oct 2026, 09:00","3 Oct 2026, 10:00","","Barbell Bench Press","","","0","normal","225","5","","",""',
    ].join('\n');
    expect(parseWorkoutsCsv(csv, resolve)[0]!.exercises[0]!.sets[0]!.weight).toBe(102.1);
  });

  it("relit l'export de REPS (aller-retour) et ignore les séances déjà présentes", () => {
    const gym = [{ date: { toDate: () => new Date(2026, 9, 2, 18, 5) }, duration: 3900, title: 'Jambes', note: 'bien dormi',
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: true, actualWeight: 62.5 }] }] }] as unknown as GymSession[];
    const back = parseWorkoutsCsv(sessionsToCsv(gym, []), resolve);
    expect(back[0]!.exercises[0]!.sets).toEqual([{ weight: 62.5, reps: 8, completed: true }]);
    expect(back[0]).toMatchObject({ title: 'Jambes', note: 'bien dormi' }); // titre et note de séance (#64)
    expect(newSessionsOnly(back, [new Date(2026, 9, 2, 18, 5, 30)])).toEqual([]);
  });

  it('aller-retour : un gainage lesté passé en reps reste en reps', () => {
    const gym = [{ date: { toDate: () => new Date(2026, 9, 2, 18, 5) }, duration: 600,
      exercises: [{ exerciseId: 'weighted_plank', name: 'Gainage lesté', emoji: '🪨', timed: false, sets: [{ weight: 20, reps: 12, completed: true }] }] }] as unknown as GymSession[];
    const plank = exerciseResolver([{ id: 'weighted_plank', name: 'Gainage lesté', emoji: '🪨' }]);
    const ex = parseWorkoutsCsv(sessionsToCsv(gym, []), plank)[0]!.exercises[0]!;
    expect(isTimed(ex)).toBe(false);
    expect(ex.sets).toEqual([{ weight: 20, reps: 12, completed: true }]);
  });
});

describe('exerciseResolver', () => {
  const lib = exerciseResolver([
    { id: 'weighted_pullups', name: 'Tractions lestées', emoji: '💪' },
    { id: 'lib_fr_1', name: 'Tractions lestées', emoji: '🏋️' },
    { id: 'lib_0025', name: 'Barbell bench press', emoji: '🏋️' },
    { id: 'lib_0294', name: 'Dumbbell biceps curl', emoji: '🏋️' },
  ]);

  it('reconnaît le nommage Strong / Hevy « Exercice (Matériel) »', () => {
    expect(lib('Bench Press (Barbell)').exerciseId).toBe('lib_0025');
    expect(lib('Bicep Curl (Dumbbell)').exerciseId).toBe('lib_0294'); // bicep / biceps
  });

  it("garde l'exercice REPS quand la bibliothèque a le même nom (réimport sans historique coupé en deux)", () => {
    expect(lib('Tractions lestées').exerciseId).toBe('weighted_pullups');
  });
});

describe('exerciseResolver : exercices de base REPS', () => {
  const base = exerciseResolver([
    ...MUSCULATION_EXERCISES.map((e) => ({ id: e.id, name: e.name, emoji: e.emoji })),
    { id: 'lib_0025', name: 'Barbell bench press', emoji: '🏋️' },
  ]);

  it('relie les grands mouvements Strong / Hevy aux exercices de base (même historique que dans REPS)', () => {
    expect(base('Bench Press (Barbell)').exerciseId).toBe('bench_press'); // pas son homonyme de la bibliothèque
    expect(base('Squat (Barbell)').exerciseId).toBe('barbell_squat');
    expect(base('Lat Pulldown (Cable)').exerciseId).toBe('lat_pulldown');
    expect(base('Triceps Pushdown (Cable - Straight Bar)').exerciseId).toBe('tricep_pushdown');
    expect(base('Lying Leg Curl (Machine)').exerciseId).toBe('leg_curl');
  });
});

describe("aperçu d'import", () => {
  const day = (d: number) => ({ date: new Date(2024, 6, d, 18) });

  it('une seule journée : pas de « du 29/07/2024 au 29/07/2024 »', () => {
    expect(importSummary([day(29)], 3, 4, false)).toBe('1 séance du 29/07/2024 · 3/4 exercices reconnus (les autres deviennent des exercices perso) · charges lues en kg.');
    expect(importSummary([day(1), day(29)], 4, 4, false)).toMatch(/^2 séances du 01\/07\/2024 au 29\/07\/2024 · /);
  });

  it('dit quand les charges étaient en livres', () => {
    expect(importSummary([day(29)], 1, 1, true)).toMatch(/charges converties des livres en kg\.$/);
    expect(POUNDS_HEADER.test('title,start_time,weight_lbs,reps')).toBe(true);
    expect(POUNDS_HEADER.test('"Date";"Weight (lbs)";"Reps"')).toBe(true);
    expect(POUNDS_HEADER.test('"Date";"Weight (kg)";"Reps"')).toBe(false);
  });
});

describe('import : variantes et réimport', () => {
  const known = [
    ...MUSCULATION_EXERCISES.map((e) => ({ id: e.id, name: e.name, emoji: e.emoji })),
    { id: 'lib_0025', name: 'Barbell bench press', emoji: '🏋️' },
  ];
  const strong = (rows: [string, string, string, string, string][]) => [
    'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
    ...rows.map(([ex, order, w, r, note]) => `2026-10-02 18:00:00,Push,1h,${ex},${order},${w},${r},,,${note},,`),
  ].join('\n');

  it('garde séparées deux variantes différentes faites dans la même séance (séries et notes intactes)', () => {
    const [s] = parseWorkoutsCsv(strong([
      ['Triceps Pushdown (Cable - Straight Bar)', '1', '40', '10', 'barre'],
      ['Triceps Rope Pushdown', '1', '25', '12', 'corde'],
      ['Standing Calf Raise (Machine)', '1', '120', '10', ''],
      ['Seated Calf Raise (Machine)', '1', '40', '15', ''],
    ]), exerciseResolver(known));
    expect(s!.exercises).toHaveLength(4);
    expect(s!.exercises.map((e) => e.note).filter(Boolean)).toEqual(['barre', 'corde']);
  });

  it("deux noms du même exercice dans une séance : séries regroupées, aucune note perdue", () => {
    const [s] = parseWorkoutsCsv(strong([
      ['Triceps Pushdown (Cable - Straight Bar)', '1', '40', '10', 'barre'],
      ['Triceps Pushdown', '2', '40', '8', 'lent'],
    ]), exerciseResolver(known));
    expect(s!.exercises).toHaveLength(1);
    expect(s!.exercises[0]).toMatchObject({ exerciseId: 'tricep_pushdown', note: 'barre · lent' });
    expect(s!.exercises[0]!.sets).toHaveLength(2);
  });

  it("réimport d'un export REPS : un exercice anglais de la bibliothèque reste le même (le nom exact passe avant l'alias)", () => {
    const resolve = exerciseResolver(known);
    expect(resolve('Barbell bench press').exerciseId).toBe('lib_0025');
    expect(resolve('Bench Press (Barbell)').exerciseId).toBe('bench_press');
  });
});
