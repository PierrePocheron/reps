import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AddGymExerciseDialog } from '../AddGymExerciseDialog';
import { AddExerciseDialog } from '../AddExerciseDialog';

const type = (text: string) =>
  fireEvent.change(screen.getByPlaceholderText('Rechercher…'), { target: { value: text } });

describe('Essentiels search in the exercise pickers', () => {
  it('gym picker ignores accents (« developpe » finds « Développé couché »)', () => {
    render(<AddGymExerciseDialog open onOpenChange={() => {}} onAdd={() => {}} hasExercise={() => false} />);
    type('developpe');
    expect(screen.getByText('Développé couché')).toBeInTheDocument();
  });

  it('renfo picker trims the query (« Pompes␣ » still shows « Pompes »)', () => {
    render(
      <AddExerciseDialog open onOpenChange={() => {}} onAddDefault={() => {}} onAddCustom={() => {}} hasExercise={() => false} />
    );
    type('Pompes ');
    expect(screen.getByText('Pompes')).toBeInTheDocument();
    type('pompes declinees');
    expect(screen.getByText('Pompes déclinées')).toBeInTheDocument();
  });
});
