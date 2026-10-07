import { describe, it, expect, vi } from 'vitest';
import { writeBatch } from 'firebase/firestore';
import { importGymSessions } from '../gymSessions';
import type { GymSession } from '../types';

const bench = (weight: number) => [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ reps: 5, weight, completed: true }] }];

describe('importGymSessions', () => {
  it('rates the imported sets oldest first, against the sessions dated before them (recap and shared card count them)', async () => {
    const set = vi.fn();
    vi.mocked(writeBatch).mockReturnValueOnce({ set, commit: () => Promise.resolve() } as never);
    // a newer session already in REPS must not take the trophy from an older imported one
    const existing = [{ date: { toDate: () => new Date(2026, 2, 1) }, exercises: bench(200) }] as unknown as GymSession[];
    await importGymSessions('u1', [
      { date: new Date(2026, 1, 15), duration: 3600, exercises: bench(90) }, // listed before the older one
      { date: new Date(2026, 0, 10), duration: 3600, exercises: bench(80) }, // first ever: no record
      { date: new Date(2026, 1, 20), duration: 3600, exercises: bench(85) }, // below the 90 of the 15th
    ], existing);
    const trophies = Object.fromEntries(set.mock.calls.map(([, data]) => [data.date.toDate().getDate(), data.exercises[0].sets[0].isRecord ?? false]));
    expect(trophies).toEqual({ 10: false, 15: true, 20: false });
  });
});
