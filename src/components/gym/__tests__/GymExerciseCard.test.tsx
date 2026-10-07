import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GymExerciseCard } from '../GymExerciseCard';
import type { GymSessionExercise } from '@/firebase/types';

const ex = (weight: number): GymSessionExercise =>
  ({ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ reps: 8, weight, completed: false }] });

describe('GymExerciseCard — saisie des charges planifiées', () => {
  it('accepte la virgule française, garde la saisie en cours et suit la valeur venue du store', () => {
    const onUpdateSet = vi.fn();
    const props = { onAddSet: vi.fn(), onUpdateSet, onRemoveSet: vi.fn(), onRemoveExercise: vi.fn() };
    const { rerender } = render(<GymExerciseCard exercise={ex(82.5)} {...props} />);
    const weight = () => screen.getByLabelText('Charge en kg, série 1') as HTMLInputElement;
    expect(weight().value).toBe('82,5');
    expect(weight()).toHaveAttribute('inputmode', 'decimal');

    fireEvent.change(weight(), { target: { value: '8' } });
    fireEvent.change(weight(), { target: { value: '80,' } });
    expect(onUpdateSet).toHaveBeenLastCalledWith(0, { weight: 80 });
    rerender(<GymExerciseCard exercise={ex(80)} {...props} />);
    expect(weight().value).toBe('80,'); // la virgule tapée reste là pour la décimale

    fireEvent.change(weight(), { target: { value: '80,5' } });
    expect(onUpdateSet).toHaveBeenLastCalledWith(0, { weight: 80.5 });

    rerender(<GymExerciseCard exercise={ex(60)} {...props} />); // changée ailleurs (série retirée…)
    expect(weight().value).toBe('60');
  });

  it('les répétitions restent entières (une virgule tapée par erreur est ignorée)', () => {
    const onUpdateSet = vi.fn();
    const props = { onAddSet: vi.fn(), onUpdateSet, onRemoveSet: vi.fn(), onRemoveExercise: vi.fn() };
    const { rerender } = render(<GymExerciseCard exercise={ex(80)} {...props} />);
    const reps = () => screen.getByLabelText('Répétitions visées, série 1') as HTMLInputElement;
    fireEvent.change(reps(), { target: { value: '9' } });
    rerender(<GymExerciseCard exercise={{ ...ex(80), sets: [{ reps: 9, weight: 80, completed: false }] }} {...props} />);
    fireEvent.change(reps(), { target: { value: '9,' } });
    fireEvent.change(reps(), { target: { value: '9,5' } });
    fireEvent.change(reps(), { target: { value: '9.5' } });
    expect(onUpdateSet.mock.calls).toEqual([[0, { reps: 9 }]]);
    expect(reps().value).toBe('9');
  });
});
