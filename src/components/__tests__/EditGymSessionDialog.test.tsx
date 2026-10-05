import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditGymSessionDialog } from '../EditGymSessionDialog';
import { suggestNextWeight } from '@/utils/progression';
import type { GymSession, GymSessionExercise } from '@/firebase/types';

const session = {
  date: { toDate: () => new Date(2026, 9, 1) },
  exercises: [{ exerciseId: 'barbell_squat', name: 'Squat barre', emoji: '🦵', sets: [
    { reps: 5, weight: 100, actualReps: 5, actualWeight: 100, completed: true },
    { reps: 5, weight: 100, actualReps: 3, actualWeight: 100, completed: true }, // missed reps
    { reps: 5, weight: 100, completed: false },                                  // set not done
  ] }],
} as unknown as GymSession;

describe('EditGymSessionDialog', () => {
  it('saving without changes keeps targets and unfinished sets (no false « tout réussi » next time)', async () => {
    const onSave = vi.fn(async (_exercises: GymSessionExercise[]) => {});
    render(<EditGymSessionDialog session={session} onCancel={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls[0]![0];
    expect(saved[0]!.sets).toHaveLength(3);
    expect(suggestNextWeight([{ ...session, exercises: saved }], 'barbell_squat')).toBeNull();
  });

  it('an edited value is the achieved one, the target stays', async () => {
    const onSave = vi.fn(async (_exercises: GymSessionExercise[]) => {});
    render(<EditGymSessionDialog session={session} onCancel={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Répétitions, série 2 de Squat barre' }), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0][0]!.sets[1]).toMatchObject({ reps: 5, actualReps: 4, completed: true });
  });

  it('removing every set of one superset member unlinks the other (no lone « Superset A »)', async () => {
    const onSave = vi.fn(async (_exercises: GymSessionExercise[]) => {});
    const pair = { ...session, exercises: [
      { exerciseId: 'a', name: 'A', emoji: '🏋️', supersetId: 'ss1', sets: [{ reps: 10, weight: 20, completed: true }] },
      { exerciseId: 'b', name: 'B', emoji: '🏋️', supersetId: 'ss1', sets: [{ reps: 10, weight: 20, completed: true }] },
    ] } as unknown as GymSession;
    render(<EditGymSessionDialog session={pair} onCancel={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la série 1 de B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0]).toEqual([expect.objectContaining({ exerciseId: 'a', supersetId: undefined })]);
  });
});
