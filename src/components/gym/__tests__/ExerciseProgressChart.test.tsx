import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExerciseProgressChart } from '../ExerciseProgressChart';
import { exerciseHistory } from '@/utils/records';
import type { GymSession } from '@/firebase/types';

const daysAgo = (n: number, reps: number) => ({
  date: { toDate: () => new Date(Date.now() - n * 86_400_000) },
  exercises: [{ exerciseId: 'chest_dips', name: 'Dips', emoji: '💪', sets: [{ weight: 0, reps, completed: true }] }],
}) as unknown as GymSession;

describe('ExerciseProgressChart', () => {
  it('a bodyweight exercise gets a reps curve instead of « Aucune séance sur cette période »', () => {
    render(<ExerciseProgressChart points={exerciseHistory([daysAgo(1, 18), daysAgo(5, 15), daysAgo(10, 12)], 'chest_dips')} />);
    expect(screen.queryByText('Aucune séance sur cette période.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reps max' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Record : 18 reps/)).toBeInTheDocument();
  });
});
