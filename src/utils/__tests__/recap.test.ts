import { describe, it, expect } from 'vitest';
import { periodRecap, recapRange, recapCard } from '../recap';
import type { GymSession, Session } from '@/firebase/types';

const ts = (d: Date) => ({ toDate: () => d }) as unknown as GymSession['date'];

describe('récap', () => {
  it('bornes du mois et de l\'année, libellé en français', () => {
    const now = new Date(2026, 9, 3);
    expect(recapRange('month', -1, now)).toEqual({ from: new Date(2026, 8, 1), to: new Date(2026, 9, 1), label: 'Septembre 2026' });
    expect(recapRange('year', 0, now)).toMatchObject({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1), label: '2026' });
  });

  it('agrège la période seulement, sans les échauffements', () => {
    const gym = [
      { date: ts(new Date(2026, 8, 10, 18)), exercises: [{ exerciseId: 'bench_press', name: 'DC', emoji: '🏋️', sets: [
        { weight: 40, reps: 10, completed: true, type: 'warmup' },
        { weight: 80, reps: 8, completed: true, isRecord: true },
        { weight: 80, reps: 8, completed: true },
      ] }] },
      { date: ts(new Date(2026, 9, 1, 18)), exercises: [{ exerciseId: 'bench_press', name: 'DC', emoji: '🏋️', sets: [{ weight: 100, reps: 5, completed: true }] }] },
    ] as GymSession[];
    const renfo = [
      { date: ts(new Date(2026, 8, 10, 7)), exercises: [{ name: 'Squats', emoji: '🦵', reps: 48 }], totalReps: 48 },
    ] as Session[];
    const r = periodRecap(gym, renfo, new Date(2026, 8, 1), new Date(2026, 9, 1));
    expect(r).toMatchObject({ sessions: 2, trainingDays: 1, volume: 1280, reps: 64, records: 1 });
    expect(r.topMuscles[0]).toEqual({ group: 'Jambes', sets: 4 });
    expect(recapCard(r, 'Septembre 2026', new Date(2026, 8, 1)).stats.map((s) => s.label)).toEqual(['Séances', 'Jours', 'Volume', 'Record']);
  });
});
