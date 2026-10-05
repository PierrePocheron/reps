import { describe, it, expect } from 'vitest';
import { buildJsonExport } from '../exportJson';

const ts = (iso: string) => ({ toDate: () => new Date(iso) });

const gymSession = {
  date: ts('2026-10-01T18:00:00Z'), duration: 3600, totalVolume: 1000, totalSets: 2,
  title: 'Push', note: 'Bonne forme',
  exercises: [{
    exerciseId: 'bench', name: 'Développé couché', emoji: '🏋️', note: 'prise serrée', supersetId: 's1',
    sets: [
      { reps: 10, weight: 50, completed: true, type: 'warmup' },
      { reps: 8, weight: 80, actualReps: 9, completed: true, rpe: 8, isRecord: true },
      { reps: 8, weight: 80, completed: false },
    ],
  }, {
    exerciseId: 'plank', name: 'Gainage', emoji: '🧱', timed: true,
    sets: [{ reps: 60, weight: 0, completed: true }],
  }],
};

const build = () => buildJsonExport({
  user: { displayName: 'camille', firstName: 'Camille', lastName: 'Demo', birthDate: '1997-01-01', weight: 64, badges: ['b1'], emailHash: 'x', searchName: 'camille' } as never,
  sessions: [],
  gymSessions: [gymSession] as never,
  body: [{ date: '2026-10-01', weight: 64, waist: 70 }],
  templates: [{ id: 't1', name: 'Haut du corps', emoji: '💪', description: '', workoutType: 'musculation', muscuExercises: [{ exerciseId: 'bench', sets: [{ reps: 8, weight: 80 }] }] }] as never,
  now: new Date('2026-10-04T12:00:00Z'),
});

describe('buildJsonExport', () => {
  it('includes body measurements and personal templates', () => {
    const out = build();
    expect(out.bodyMeasurements).toEqual([{ date: '2026-10-01', weight: 64, waist: 70 }]);
    expect(out.templates[0]).toMatchObject({ name: 'Haut du corps', workoutType: 'musculation' });
  });

  it('keeps the full detail of gym sessions (title, notes, set type, RPE, timed, record)', () => {
    const [s] = build().gymSessions;
    expect(s).toMatchObject({ title: 'Push', note: 'Bonne forme' });
    expect(s!.exercises[0]).toMatchObject({ name: 'Développé couché', note: 'prise serrée', supersetId: 's1' });
    expect(s!.exercises[0]!.sets).toEqual([
      { weight: 50, reps: 10, type: 'warmup' },
      { weight: 80, reps: 9, rpe: 8, isRecord: true },
    ]); // validated sets only, actual values
    expect(s!.exercises[1]!.sets).toEqual([{ weight: 0, seconds: 60 }]);
  });

  it('keeps the load of a timed set (weighted plank)', () => {
    const out = buildJsonExport({ user: null, sessions: [], body: [], templates: [], gymSessions: [{
      ...gymSession, exercises: [{ exerciseId: 'weighted_plank', name: 'Gainage lesté', emoji: '🧱', sets: [{ reps: 60, weight: 20, completed: true }] }],
    }] as never });
    expect(out.gymSessions[0]!.exercises[0]!.sets).toEqual([{ weight: 20, seconds: 60 }]);
  });

  it('exports the profile but not internal fields', () => {
    const { user } = build();
    expect(user).toMatchObject({ firstName: 'Camille', lastName: 'Demo', birthDate: '1997-01-01' });
    expect(user).not.toHaveProperty('emailHash');
    expect(user).not.toHaveProperty('searchName');
  });
});
