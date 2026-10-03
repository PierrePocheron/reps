import { describe, it, expect } from 'vitest';
import { setsByMuscle } from '../muscles';
import type { GymSession, Session } from '@/firebase/types';

const ts = (d: Date) => ({ toDate: () => d }) as unknown as GymSession['date'];
const since = new Date(2026, 8, 26);

describe('setsByMuscle', () => {
  it('muscle principal 1 série, secondaires ½, séries non validées ignorées', () => {
    const gym = [{
      date: ts(new Date(2026, 9, 1)),
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [
        { weight: 60, reps: 8, completed: true }, { weight: 60, reps: 8, completed: true }, { weight: 60, reps: 8, completed: false },
      ] }],
    }] as GymSession[];
    const r = setsByMuscle(gym, [], since);
    expect(r.Pectoraux).toBe(2);
    expect(r.Bras).toBe(1); // triceps en secondaire : 2 × ½
    expect(r.Jambes).toBe(0);
  });

  it('renfo : 1 série ≈ 12 reps, séances hors période ignorées', () => {
    const renfo = [
      { date: ts(new Date(2026, 9, 2)), exercises: [{ name: 'Squats', emoji: '🦵', reps: 36 }] },
      { date: ts(new Date(2026, 7, 1)), exercises: [{ name: 'Squats', emoji: '🦵', reps: 100 }] },
    ] as Session[];
    expect(setsByMuscle([], renfo, since).Jambes).toBe(3);
  });

  it('exercice inconnu (perso, bibliothèque) : ignoré', () => {
    const gym = [{ date: ts(new Date(2026, 9, 1)), exercises: [{ exerciseId: 'lib_0001', name: 'X', emoji: '?', sets: [{ weight: 1, reps: 1, completed: true }] }] }] as GymSession[];
    expect(Object.values(setsByMuscle(gym, [], since)).every((v) => v === 0)).toBe(true);
  });
});
