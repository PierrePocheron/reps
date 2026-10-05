import { describe, it, expect } from 'vitest';
import { estimate1RM, bestE1RMByExercise, bestSecondsByExercise, exerciseHistory, exerciseLog, isWorkSet, markRecords, isTimed, personalRecordsOf } from '../records';
import { calculateTotalVolume } from '@/firebase/gymSessions';
import type { GymSession } from '@/firebase/types';

const session = (sets: { weight: number; reps: number; completed: boolean }[]) =>
  ({ exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets }] }) as unknown as GymSession;

describe('records', () => {
  it('estime le 1RM (Epley) et ignore les séries sans charge', () => {
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 1);
    expect(estimate1RM(0, 20)).toBe(0);
  });

  it('garde le meilleur 1RM par exercice, séries validées uniquement', () => {
    const best = bestE1RMByExercise([
      session([{ weight: 80, reps: 8, completed: true }, { weight: 120, reps: 5, completed: false }]),
      session([{ weight: 85, reps: 6, completed: true }]),
    ]);
    expect(best.bench_press).toBeCloseTo(102, 1); // 85×6 (102) bat 80×8 (101,3) ; 120×5 non validée ignorée
  });

  it('construit l\'historique d\'un exercice, trié par date', () => {
    const at = (d: string) => ({ toDate: () => new Date(d) });
    const s1 = { ...session([{ weight: 60, reps: 10, completed: true }, { weight: 70, reps: 5, completed: true }]), date: at('2026-09-20') };
    const s2 = { ...session([{ weight: 50, reps: 8, completed: true }]), date: at('2026-09-10') };
    const s3 = { ...session([{ weight: 99, reps: 1, completed: false }]), date: at('2026-09-30') }; // aucune série validée
    const h = exerciseHistory([s1, s2, s3] as unknown as GymSession[], 'bench_press');
    expect(h.map((p) => p.date.toISOString().slice(0, 10))).toEqual(['2026-09-10', '2026-09-20']);
    expect(h[1]).toMatchObject({ bestWeight: 70, volume: 950 });
    expect(h[1]!.e1rm).toBeCloseTo(81.67, 1); // 70×5 (81,7) > 60×10 (80)
  });
});

describe('séries d\'échauffement', () => {
  it('ne comptent ni dans les records ni dans la courbe', () => {
    const s = [{
      date: { toDate: () => new Date(2026, 9, 1) },
      exercises: [{ exerciseId: 'bench_press', name: 'DC', emoji: '🏋️', sets: [
        { weight: 100, reps: 10, completed: true, type: 'warmup' as const },
        { weight: 60, reps: 8, completed: true },
      ] }],
    }] as unknown as Parameters<typeof bestE1RMByExercise>[0];
    expect(bestE1RMByExercise(s).bench_press).toBe(76);
    expect(exerciseHistory(s, 'bench_press')[0]).toMatchObject({ bestWeight: 60, volume: 480 });
    expect(isWorkSet({ completed: true, type: 'drop' })).toBe(true);
  });
});

describe('markRecords (#57)', () => {
  const sess = (sets: { weight: number; reps: number }[]) =>
    ({ exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: sets.map((s) => ({ ...s, completed: true })) }] }) as unknown as GymSession;

  it('trophée si la série bat les séances précédentes, puis les séries d\'avant ; jamais sans historique ni sur échauffement', () => {
    const older = [sess([{ weight: 80, reps: 5 }])];
    const [ex] = markRecords(sess([{ weight: 70, reps: 5 }, { weight: 85, reps: 5 }, { weight: 85, reps: 5 }, { weight: 100, reps: 3 }]).exercises, older);
    expect(ex!.sets.map((s) => s.isRecord)).toEqual([false, true, false, true]);
    expect(markRecords(sess([{ weight: 100, reps: 5 }]).exercises, [])[0]!.sets[0]!.isRecord).toBe(false);
    const warm = markRecords([{ exerciseId: 'bench_press', name: 'x', emoji: 'x', sets: [{ weight: 200, reps: 5, completed: true, type: 'warmup' }] }], older);
    expect(warm[0]!.sets[0]!.isRecord).toBe(false);
  });
});

describe('exercices en durée (#55)', () => {
  it('gainage lesté en durée par défaut, bascule possible ; hors 1RM et hors volume', () => {
    expect(isTimed({ exerciseId: 'weighted_plank' })).toBe(true);
    expect(isTimed({ exerciseId: 'weighted_plank', timed: false })).toBe(false);
    expect(isTimed({ exerciseId: 'bench_press' })).toBe(false);
    const plank = { exerciseId: 'plank', name: 'Gainage', emoji: '🧱', timed: true, sets: [{ weight: 10, reps: 60, completed: true }] };
    const bench = { exerciseId: 'bench_press', name: 'DC', emoji: '🏋️', sets: [{ weight: 80, reps: 5, completed: true }] };
    expect(bestE1RMByExercise([{ exercises: [plank, bench] } as unknown as GymSession])).not.toHaveProperty('plank');
    expect(calculateTotalVolume([plank, bench])).toBe(400);
  });
});

describe('exerciseHistory en durée (#55)', () => {
  it('meilleure durée par séance, sans 1RM ni volume', () => {
    const s = { date: { toDate: () => new Date(2026, 9, 1) }, exercises: [{ exerciseId: 'plank', name: 'Gainage', emoji: '🧱', timed: true,
      sets: [{ weight: 10, reps: 45, completed: true }, { weight: 10, reps: 70, completed: true }] }] } as unknown as GymSession;
    expect(exerciseHistory([s], 'plank')).toEqual([{ date: new Date(2026, 9, 1), e1rm: 0, bestWeight: 0, volume: 0, bestSeconds: 70 }]);
  });
});

describe('record de durée (#59)', () => {
  const plank = (secs: number[]) => ({ exercises: [{ exerciseId: 'plank', name: 'Gainage', emoji: '🧱', timed: true,
    sets: secs.map((reps) => ({ weight: 0, reps, completed: true })) }] }) as unknown as GymSession;

  it('meilleure durée des séances précédentes ; trophée quand on la dépasse', () => {
    expect(bestSecondsByExercise([plank([45, 60]), plank([50])])).toEqual({ plank: 60 });
    const [ex] = markRecords(plank([55, 65, 65, 80]).exercises, [plank([60])]);
    expect(ex!.sets.map((s) => s.isRecord)).toEqual([false, true, false, true]);
  });
});

describe('exerciseLog (#60)', () => {
  it('séries de travail en clair, du plus récent au plus ancien, avec le record', () => {
    const sess = (day: number, sets: PlannedSetLike[], timed = false) =>
      ({ date: { toDate: () => new Date(2026, 9, day) }, exercises: [{ exerciseId: 'bench_press', name: 'DC', emoji: '🏋️', timed, sets }] }) as unknown as GymSession;
    type PlannedSetLike = { weight: number; reps: number; completed: boolean; type?: 'warmup'; isRecord?: boolean; actualWeight?: number };
    const log = exerciseLog([
      sess(3, [{ weight: 40, reps: 10, completed: true, type: 'warmup' }, { weight: 80, reps: 8, completed: true }, { weight: 80, reps: 6, completed: true, actualWeight: 82.5, isRecord: true }]),
      sess(1, [{ weight: 0, reps: 12, completed: true }, { weight: 0, reps: 10, completed: true }]),
    ], 'bench_press');
    expect(log).toEqual([
      { date: new Date(2026, 9, 3), sets: '8×80 · 6×82,5 kg', record: true },
      { date: new Date(2026, 9, 1), sets: '12 · 10 reps', record: false },
    ]);
    expect(exerciseLog([sess(2, [{ weight: 0, reps: 60, completed: true }], true)], 'bench_press')[0]!.sets).toBe('60 s');
  });
});

describe('personalRecordsOf (onglet Records)', () => {
  it("« Max estimé sur 1 rep » = meilleur 1RM estimé, pas celui de la série au plus gros volume", () => {
    const session = { date: { toDate: () => new Date(2026, 9, 1) }, exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [
      { weight: 100, reps: 5, completed: true },
      { weight: 60, reps: 10, completed: true }, // plus gros volume (600 > 500)
    ] }] } as unknown as GymSession;
    const [pr] = personalRecordsOf([session], {});
    expect(pr).toMatchObject({ bestVolume: 600, bestWeight: 60, bestReps: 10 });
    expect(Math.round(pr!.bestE1RM)).toBe(117); // Epley 100 × 5, comme les trophées et la courbe
  });
});
