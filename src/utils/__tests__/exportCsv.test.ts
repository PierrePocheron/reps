import { describe, it, expect } from 'vitest';
import { sessionsToCsv } from '../exportCsv';
import type { GymSession, Session } from '@/firebase/types';

const ts = (d: Date) => ({ toDate: () => d }) as unknown as GymSession['date'];

describe('sessionsToCsv', () => {
  it('une ligne par série validée, renfo sans charge, ordre chronologique, champs échappés', () => {
    const gym = [{
      date: ts(new Date(2026, 9, 2, 18, 5, 0)), duration: 3900,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', note: 'prise "serrée", banc 3', sets: [
        { weight: 20, reps: 12, completed: true, type: 'warmup' },
        { weight: 60, reps: 8, completed: true, actualWeight: 62.5, rpe: 8.5 },
        { weight: 60, reps: 8, completed: false },
      ] }],
    }] as GymSession[];
    const renfo = [{ date: ts(new Date(2026, 9, 1, 7, 0, 0)), duration: 600, exercises: [{ name: 'Pompes', emoji: '💪', reps: 40 }] }] as Session[];

    const lines = sessionsToCsv(gym, renfo).split('\n');
    expect(lines[0]).toBe('Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE');
    expect(lines[1]).toBe('2026-10-01 07:00:00,Renforcement,0h 10m,Pompes,1,0,40,,,,,');
    expect(lines[2]).toBe('2026-10-02 18:05:00,Musculation,1h 5m,Développé couché,W,20,12,,,"prise ""serrée"", banc 3",,');
    expect(lines[3]).toBe('2026-10-02 18:05:00,Musculation,1h 5m,Développé couché,1,62.5,8,,,,,8.5');
    expect(lines).toHaveLength(4); // la série non validée n'est pas exportée
  });

  it('séries dégressive et à l’échec marquées D et F (relues par l’import), pas numérotées', () => {
    const gym = [{ date: ts(new Date(2026, 9, 3, 9, 0, 0)), duration: 600,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [
        { weight: 60, reps: 8, completed: true },
        { weight: 40, reps: 10, completed: true, type: 'drop' },
        { weight: 60, reps: 3, completed: true, type: 'failure' },
      ] }] }] as GymSession[];
    expect(sessionsToCsv(gym, []).split('\n').slice(1).map((l) => l.split(',')[4])).toEqual(['1', 'D', 'F']);
  });

  it('exercice en durée (#55) : secondes dans la colonne Seconds, pas dans Reps', () => {
    const gym = [{ date: ts(new Date(2026, 9, 3, 9, 0, 0)), duration: 600,
      exercises: [{ exerciseId: 'plank', name: 'Gainage', emoji: '🧱', timed: true, sets: [{ weight: 0, reps: 60, completed: true }] }] }] as GymSession[];
    expect(sessionsToCsv(gym, []).split('\n')[1]).toBe('2026-10-03 09:00:00,Musculation,0h 10m,Gainage,1,0,,,60,,,');
  });
});
