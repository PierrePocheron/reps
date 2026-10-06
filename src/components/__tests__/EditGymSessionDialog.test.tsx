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

  it('a skipped exercise stays planned for « Refaire » and keeps its superset partner', async () => {
    const onSave = vi.fn(async (_exercises: GymSessionExercise[]) => {});
    const skipped = { ...session, exercises: [
      { exerciseId: 'a', name: 'A', emoji: '🏋️', supersetId: 'ss1', sets: [{ reps: 10, weight: 20, completed: true }] },
      { exerciseId: 'b', name: 'B', emoji: '🏋️', supersetId: 'ss1', sets: [{ reps: 10, weight: 20, completed: false }] },
    ] } as unknown as GymSession;
    render(<EditGymSessionDialog session={skipped} onCancel={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0].map((ex) => [ex.exerciseId, ex.supersetId])).toEqual([['a', 'ss1'], ['b', 'ss1']]);
  });

  it('removing every done set still blocks saving when only skipped exercises are left', () => {
    const skipped = { ...session, exercises: [
      { exerciseId: 'a', name: 'A', emoji: '🏋️', sets: [{ reps: 10, weight: 20, completed: true }] },
      { exerciseId: 'b', name: 'B', emoji: '🏋️', sets: [{ reps: 10, weight: 20, completed: false }] },
    ] } as unknown as GymSession;
    render(<EditGymSessionDialog session={skipped} onCancel={() => {}} onSave={async () => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la série 1 de A' }));
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled();
  });

  it('numbers sets like the session: warm-ups apart, a skipped set leaves no gap (« É, S2, S3 » before)', () => {
    const bench = { ...session, exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [
      { reps: 10, weight: 40, completed: true, type: 'warmup' },
      { reps: 8, weight: 60, completed: false },
      { reps: 8, weight: 60, completed: true },
      { reps: 6, weight: 60, completed: true },
    ] }] } as unknown as GymSession;
    render(<EditGymSessionDialog session={bench} onCancel={() => {}} onSave={async () => {}} />);
    expect(screen.getAllByRole('button', { name: /changer le type$/ }).map((b) => b.textContent)).toEqual(['É', 'S1', 'S2']);
    expect(screen.getByRole('spinbutton', { name: 'Répétitions, échauffement 1 de Développé couché' })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: 'Répétitions, série 2 de Développé couché' })).toHaveValue(6);
    expect(screen.getByRole('button', { name: 'Retirer la série 2 de Développé couché' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Retirer l'échauffement 1 de Développé couché" })).toBeInTheDocument();
  });

  it('a load typed with the French comma is kept (« 82,5 » became 825 or 0)', async () => {
    const onSave = vi.fn(async (_exercises: GymSessionExercise[]) => {});
    render(<EditGymSessionDialog session={session} onCancel={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Charge en kg, série 1 de Squat barre' }), { target: { value: '82,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0]![0][0]!.sets[0]).toMatchObject({ actualWeight: 82.5 });
  });
});
