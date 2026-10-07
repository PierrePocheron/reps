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

  it('a load typed with the French comma is kept (« 82,5 »)', async () => {
    const onSave = vi.fn(async () => {});
    const gym = { ...template, muscuExercises: [{ exerciseId: 'barbell_squat', name: 'Squat barre', emoji: '🦵', sets: [{ reps: 5, weight: 80 }] }] };
    render(<CreateTemplateDialog open onClose={() => {}} onSave={onSave} initial={gym} />);
    fireEvent.click(screen.getByRole('button', { name: 'Séries de Squat barre' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Charge en kg, série 1 de Squat barre' }), { target: { value: '82,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le modèle' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      muscuExercises: [expect.objectContaining({ sets: [expect.objectContaining({ weight: 82.5 })] })],
    }));
  });

  it('the set remove and close buttons are named', () => {
    const gym = { ...template, muscuExercises: [{ exerciseId: 'barbell_squat', name: 'Squat barre', emoji: '🦵', sets: [{ reps: 5, weight: 80 }, { reps: 5, weight: 80 }] }] };
    render(<CreateTemplateDialog open onClose={() => {}} onSave={async () => {}} initial={gym} />);
    fireEvent.click(screen.getByRole('button', { name: 'Séries de Squat barre' }));
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer la série 2 de Squat barre' }));
    expect(screen.queryByRole('button', { name: /Retirer la série/ })).not.toBeInTheDocument(); // a lone set can't be removed
  });

  it('a tap on the backdrop closes an untouched template but keeps an edited one; ✕ still discards', () => {
    const onClose = vi.fn();
    const untouched = render(<CreateTemplateDialog open onClose={onClose} onSave={async () => {}} initial={template} />);
    fireEvent.click(untouched.container.querySelector('.backdrop-blur-sm')!);
    expect(onClose).toHaveBeenCalledTimes(1);
    untouched.unmount();

    const { container } = render(<CreateTemplateDialog open onClose={onClose} onSave={async () => {}} initial={template} />);
    const backdrop = container.querySelector('.backdrop-blur-sm')!;
    fireEvent.change(screen.getByRole('textbox', { name: 'Nom du modèle' }), { target: { value: 'Core 2' } });
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Nom du modèle' })).toHaveValue('Core 2');

    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('a new template is protected from a backdrop tap once something is picked', () => {
    const onClose = vi.fn();
    const { container } = render(<CreateTemplateDialog open onClose={onClose} onSave={async () => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Icône 🔥' }));
    fireEvent.click(container.querySelector('.backdrop-blur-sm')!);
    expect(onClose).not.toHaveBeenCalled();
  });
});
