import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateTemplateDialog } from '../CreateTemplateDialog';
import type { WorkoutTemplate } from '@/firebase/types';

const template: WorkoutTemplate = {
  id: 't1', name: 'Core', description: '', emoji: '🔥', workoutType: 'musculation',
  muscuExercises: [{ exerciseId: 'lib_0464', name: 'Planche', emoji: '🧘', timed: true, sets: [{ reps: 60, weight: 0 }] }],
};

describe('CreateTemplateDialog', () => {
  it('saving an edited template keeps the seconds unit of a timed exercise', async () => {
    const onSave = vi.fn(async () => {});
    render(<CreateTemplateDialog open onClose={() => {}} onSave={onSave} initial={template} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le modèle' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      muscuExercises: [expect.objectContaining({ exerciseId: 'lib_0464', timed: true })],
    }));
  });

  it('tapping the type already selected keeps the exercise list', () => {
    render(<CreateTemplateDialog open onClose={() => {}} onSave={async () => {}} initial={template} />);
    fireEvent.click(screen.getByRole('button', { name: 'Musculation' }));
    expect(screen.getByText('Exercices (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enregistrer le modèle' })).toBeEnabled();
  });
});
