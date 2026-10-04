import { describe, it, expect } from 'vitest';
import { suggestNextWeight, incrementFor, lastWorkSets, templateFromSession, redoExercises } from '../progression';
import type { GymSession, PlannedSet } from '@/firebase/types';

const session = (exerciseId: string, sets: PlannedSet[]) =>
  ({ date: { toDate: () => new Date() }, exercises: [{ exerciseId, name: exerciseId, emoji: '🏋️', sets }] }) as unknown as GymSession;
const done = (weight: number, reps: number, actualReps = reps): PlannedSet => ({ weight, reps, actualReps, completed: true });

describe('suggestNextWeight', () => {
  it('toutes les séries réussies → +2,5 kg (échauffement ignoré)', () => {
    const h = [session('bench_press', [{ ...done(40, 10), type: 'warmup' }, done(80, 8), done(80, 8), done(80, 8, 9)])];
    expect(suggestNextWeight(h, 'bench_press')).toMatchObject({ from: 80, to: 82.5, summary: '3 × 8 à 80 kg' });
  });

  it('une série ratée ou non validée → pas de suggestion', () => {
    expect(suggestNextWeight([session('bench_press', [done(80, 8), done(80, 8, 6)])], 'bench_press')).toBeNull();
    expect(suggestNextWeight([session('bench_press', [done(80, 8), { weight: 80, reps: 8, completed: false }])], 'bench_press')).toBeNull();
  });

  it('se base sur la dernière séance contenant l\'exercice', () => {
    const h = [session('deadlift', [done(100, 5)]), session('bench_press', [done(70, 8)]), session('bench_press', [done(60, 8)])];
    expect(suggestNextWeight(h, 'bench_press')?.to).toBe(72.5);
  });

  it('petits muscles : +1,25 kg ; poids du corps : rien', () => {
    expect(incrementFor('db_lateral_raise')).toBe(1.25);
    expect(incrementFor('barbell_curl')).toBe(1.25);
    expect(incrementFor('barbell_squat')).toBe(2.5);
    expect(suggestNextWeight([session('pullups', [done(0, 10)])], 'pullups')).toBeNull();
  });
});

describe('lastWorkSets', () => {
  it('recopie les séries validées de la dernière séance, sans échauffement', () => {
    const h = [session('bench_press', [{ ...done(40, 10), type: 'warmup' }, done(80, 8, 9), done(80, 8), { weight: 80, reps: 8, completed: false }])];
    expect(lastWorkSets(h, 'bench_press')).toEqual([{ reps: 9, weight: 80 }, { reps: 8, weight: 80 }]);
    expect(lastWorkSets(h, 'deadlift')).toEqual([]);
  });
});

describe('templateFromSession', () => {
  it('reprend les séries de travail réalisées, sans échauffement ni exercice vide', () => {
    const s = { exercises: [
      { exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ ...done(40, 10), type: 'warmup' as const }, done(80, 8, 9), done(80, 8)] },
      { exerciseId: 'dips', name: 'Dips', emoji: '♣️', sets: [] },
    ] };
    expect(templateFromSession(s, '  Ma séance  ')).toEqual({
      name: 'Ma séance', emoji: '🏋️', workoutType: 'musculation', description: 'Développé couché · Dips',
      muscuExercises: [{ exerciseId: 'bench_press', sets: [{ reps: 9, weight: 80 }, { reps: 8, weight: 80 }] }],
    });
  });
});

describe('redoExercises', () => {
  it("« Refaire » garde le type des séries : un échauffement reste un échauffement (volume, « Précédent », Appliquer)", () => {
    const [ex] = redoExercises({ exercises: [{ exerciseId: 'barbell_squat', name: 'Squat barre', emoji: '🦵', sets: [
      { reps: 8, weight: 40, completed: true, type: 'warmup' },
      { reps: 5, weight: 100, actualReps: 4, actualWeight: 100, completed: true },
    ] }] });
    expect(ex!.sets).toEqual([
      { reps: 8, weight: 40, completed: false, type: 'warmup' },
      { reps: 4, weight: 100, completed: false }, // réalisé, prêt à valider
    ]);
  });
});
