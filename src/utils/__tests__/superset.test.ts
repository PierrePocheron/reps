import { describe, it, expect } from 'vitest';
import { toggleSupersetLink, restAfterSet, supersetLetters } from '../superset';
import type { GymSessionExercise } from '@/firebase/types';

const ex = (id: string, done: number, total = 3, supersetId?: string): GymSessionExercise => ({
  exerciseId: id, name: id, emoji: '🏋️', supersetId,
  sets: Array.from({ length: total }, (_, k) => ({ weight: 20, reps: 10, completed: k < done })),
});
let n = 0;
const id = () => `g${++n}`;

describe('supersets', () => {
  it('lier, étendre puis délier un groupe', () => {
    let l = [ex('a', 0), ex('b', 0), ex('c', 0)];
    l = toggleSupersetLink(l, 0, id);
    expect(l.map((e) => e.supersetId)).toEqual(['g1', 'g1', undefined]);
    l = toggleSupersetLink(l, 1, id);
    expect(l.map((e) => e.supersetId)).toEqual(['g1', 'g1', 'g1']);
    l = toggleSupersetLink(l, 0, id); // a se détache, b + c restent ensemble
    expect(l[0]!.supersetId).toBeUndefined();
    expect(l[1]!.supersetId).toBe(l[2]!.supersetId);
  });

  it('repos seulement quand tout le groupe a fait son tour', () => {
    expect(restAfterSet([ex('a', 1, 3, 'g'), ex('b', 0, 3, 'g')], 'a')).toBe(false); // B1 attend
    expect(restAfterSet([ex('a', 1, 3, 'g'), ex('b', 1, 3, 'g')], 'b')).toBe(true);  // tour fini
    expect(restAfterSet([ex('a', 3, 3, 'g'), ex('b', 2, 2, 'g')], 'a')).toBe(true);  // b n'a pas de 3e série
    expect(restAfterSet([ex('a', 1)], 'a')).toBe(true);
  });

  it('lettres A, B par groupe', () => {
    expect(supersetLetters([ex('a', 0, 1, 'x'), ex('b', 0, 1, 'x'), ex('c', 0, 1), ex('d', 0, 1, 'y')])).toEqual({ x: 'A', y: 'B' });
  });
});
