import { describe, it, expect } from 'vitest';
import { parseCsv, parseWorkoutsCsv, newSessionsOnly, exerciseResolver } from '../importCsv';
import { sessionsToCsv } from '../exportCsv';
import type { GymSession } from '@/firebase/types';

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
    expect(s!.exercises[0]).toMatchObject({ exerciseId: 'bench_press', name: 'Développé couché', note: 'banc 3',
      sets: [{ weight: 20, reps: 12, completed: true, type: 'warmup' }, { weight: 62.5, reps: 8, completed: true, rpe: 8.5 }] });
    expect(s!.exercises[1]).toMatchObject({ exerciseId: 'import_gainage', timed: true, sets: [{ reps: 60, weight: 0 }] });
  });

  it('export Hevy : début / fin, types, poids en kg', () => {
    const csv = [
      '"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"',
      '"Pull","3 Oct 2026, 09:00","3 Oct 2026, 10:15","","Barbell Bench Press","","","0","normal","80","5","","",""',
      '"Pull","3 Oct 2026, 09:00","3 Oct 2026, 10:15","","Barbell Bench Press","","","1","failure","80","4","","","9"',
    ].join('\n');
    const [s] = parseWorkoutsCsv(csv, resolve);
    expect(s).toMatchObject({ date: new Date(2026, 9, 3, 9, 0), duration: 4500,
      exercises: [{ exerciseId: 'lib_0025', sets: [{ weight: 80, reps: 5 }, { weight: 80, reps: 4, type: 'failure', rpe: 9 }] }] });
  });

  it("relit l'export de REPS (aller-retour) et ignore les séances déjà présentes", () => {
    const gym = [{ date: { toDate: () => new Date(2026, 9, 2, 18, 5) }, duration: 3900,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: true, actualWeight: 62.5 }] }] }] as unknown as GymSession[];
    const back = parseWorkoutsCsv(sessionsToCsv(gym, []), resolve);
    expect(back[0]!.exercises[0]!.sets).toEqual([{ weight: 62.5, reps: 8, completed: true }]);
    expect(newSessionsOnly(back, [new Date(2026, 9, 2, 18, 5, 30)])).toEqual([]);
  });
});
