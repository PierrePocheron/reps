import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GymTemplatePreviewSheet } from '../GymTemplatePreviewSheet';
import type { WorkoutTemplate } from '@/firebase/types';

describe('GymTemplatePreviewSheet', () => {
  it('shows a timed exercise in seconds, not reps', () => {
    const template: WorkoutTemplate = {
      id: 't1', name: 'Core', description: '', emoji: '🔥', workoutType: 'musculation',
      muscuExercises: [{ exerciseId: 'lib_0464', name: 'Planche', emoji: '🧘', timed: true, sets: [{ reps: 60, weight: 0 }] }],
    };
    render(<GymTemplatePreviewSheet template={template} onClose={() => {}} onStart={() => {}} />);
    expect(screen.getByText('· 60 s')).toBeInTheDocument();
    expect(screen.queryByText(/60 reps/)).not.toBeInTheDocument();
  });
});
