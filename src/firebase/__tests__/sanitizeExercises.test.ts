import { describe, it, expect } from 'vitest';
import { sanitizeExercises } from '../gymSessions';

describe('sanitizeExercises', () => {
  it('never stores a negative or invalid weight / rep count (min=0 does not stop typing « -5 »)', () => {
    const [ex] = sanitizeExercises([{
      exerciseId: 'bench', name: 'DC', emoji: '🏋️',
      sets: [{ reps: -3, weight: -5, completed: true, actualReps: -1, actualWeight: Number.NaN }],
    }] as never);
    expect(ex!.sets[0]).toMatchObject({ reps: 0, weight: 0, actualReps: 0, actualWeight: 0 });
  });

  it('keeps valid decimals untouched', () => {
    const [ex] = sanitizeExercises([{
      exerciseId: 'bench', name: 'DC', emoji: '🏋️', sets: [{ reps: 8, weight: 57.5, completed: true }],
    }] as never);
    expect(ex!.sets[0]).toMatchObject({ reps: 8, weight: 57.5 });
  });
});
