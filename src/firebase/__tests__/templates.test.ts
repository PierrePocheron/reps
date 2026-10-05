import { describe, it, expect, vi } from 'vitest';
import { updateDoc } from 'firebase/firestore';
import { updateUserTemplate } from '../templates';

describe('updateUserTemplate', () => {
  it("drops the other type's list when the template switches type (updateDoc merges: « 5 exo » for 1)", async () => {
    vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
    await updateUserTemplate('u1', 't1', { name: 'Push', description: '', emoji: '🏋️', workoutType: 'musculation',
      muscuExercises: [{ exerciseId: 'bench_press', sets: [{ reps: 8, weight: 60 }] }] });
    expect(vi.mocked(updateDoc).mock.calls[0]![1]).toMatchObject({ exerciseIds: '__deleteField__', workoutType: 'musculation' });
    expect(vi.mocked(updateDoc).mock.calls[0]![1]).not.toHaveProperty('muscuExercises', '__deleteField__');
  });
});
