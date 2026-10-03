import { describe, it, expect } from 'vitest';
import { sessionsToCsv } from '../exportCsv';
import type { GymSession, Session } from '@/firebase/types';

const ts = (d: Date) => ({ toDate: () => d }) as unknown as GymSession['date'];

describe('sessionsToCsv', () => {
  it('une ligne par série validée, renfo sans charge, ordre chronologique, champs échappés', () => {
    const gym = [{
      date: ts(new Date(2026, 9, 2, 18, 5, 0)), duration: 3900,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', note: 'prise "serrée", banc 3', sets: [
        { weight: 60, reps: 8, completed: true, actualWeight: 62.5, rpe: 8.5 },
        { weight: 60, reps: 8, completed: false },
      ] }],
    }] as GymSession[];
    const renfo = [{ date: ts(new Date(2026, 9, 1, 7, 0, 0)), duration: 600, exercises: [{ name: 'Pompes', emoji: '💪', reps: 40 }] }] as Session[];

    const lines = sessionsToCsv(gym, renfo).split('\n');
    expect(lines[0]).toBe('Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE');
    expect(lines[1]).toBe('2026-10-01 07:00:00,Renforcement,0h 10m,Pompes,1,0,40,,,,,');
    expect(lines[2]).toBe('2026-10-02 18:05:00,Musculation,1h 5m,Développé couché,1,62.5,8,,,"prise ""serrée"", banc 3",,8.5');
    expect(lines).toHaveLength(3); // la série non validée n'est pas exportée
  });
});
