import { describe, it, expect } from 'vitest';
import { suggestNextWeight, incrementFor, lastWorkSets, templateFromSession, redoExercises, isLoadSet, templateExercise } from '../progression';
import { isTimed } from '../records';
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

  it('une série dégressive ne compte pas pour la charge (ni dans le résumé, ni ratée)', () => {
    const h = [session('bench_press', [done(100, 5), done(100, 5), done(100, 5), { ...done(60, 12, 8), type: 'drop' }])];
    expect(suggestNextWeight(h, 'bench_press')).toMatchObject({ from: 100, to: 102.5, summary: '3 × 5 à 100 kg' });
    expect([isLoadSet({ type: 'drop' }), isLoadSet({ type: 'warmup' }), isLoadSet({ type: 'failure' }), isLoadSet({})]).toEqual([false, false, true, true]);
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
      muscuExercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ reps: 9, weight: 80 }, { reps: 8, weight: 80 }] }],
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

describe('modèle enregistré depuis une séance (bibliothèque, import)', () => {
  const s = { exercises: [
    { exerciseId: 'lib_0001', name: 'Relevé de buste 3/4', emoji: '💪', imageUrl: 'https://img/lib_0001.gif', sets: [done(0, 15)] },
    { exerciseId: 'import_hip_thrust_barbell', name: 'Hip Thrust (Barbell)', emoji: '🏋️', sets: [done(80, 10)] },
    { exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [done(80, 8)] },
  ] };

  it("garde nom, emoji et image : le modèle n'affiche plus « lib_0001 »", () => {
    const t = templateFromSession(s, 'Push');
    expect(t.muscuExercises.map(templateExercise).map((e) => [e.name, e.imageUrl])).toEqual([
      ['Relevé de buste 3/4', 'https://img/lib_0001.gif'],
      ['Hip Thrust (Barbell)', undefined],
      ['Développé couché', undefined],
    ]);
    expect(t.muscuExercises[1]).not.toHaveProperty('imageUrl'); // Firestore refuses undefined fields
  });

  it('keeps the unit chosen in session: a plank in seconds stays timed, a weighted plank in reps stays in reps', () => {
    const t = templateFromSession({ exercises: [
      { exerciseId: 'lib_0464', name: 'Planche', emoji: '🧘', timed: true, sets: [done(0, 60)] },
      { exerciseId: 'weighted_plank', name: 'Gainage lesté', emoji: '🧘', timed: false, sets: [done(10, 12)] },
      ...s.exercises,
    ] }, 'Core');
    expect(t.muscuExercises.map(templateExercise).map(isTimed)).toEqual([true, false, false, false, false]);
    expect(t.muscuExercises[2]).not.toHaveProperty('timed'); // Firestore refuses undefined fields
  });

  it('ancien modèle sans nom gardé : identifiant en dernier recours', () => {
    expect(templateExercise({ exerciseId: 'lib_0042', sets: [] }).name).toBe('lib_0042');
  });
});
