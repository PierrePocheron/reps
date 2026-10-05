import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseImage } from '../ExerciseImage';

describe('ExerciseImage', () => {
  it("falls back to the emoji when the picture cannot load (offline: broken image and cut alt text)", () => {
    render(<ExerciseImage src="/exercises/bench.jpg" alt="Développé couché" emoji="🏋️" />);
    fireEvent.error(screen.getByRole('img', { name: 'Développé couché' }));
    expect(screen.queryByRole('img', { name: 'Développé couché' })).not.toBeInTheDocument();
    expect(screen.getByText('🏋️')).toBeInTheDocument();
  });

  it('shows the emoji when there is no picture', () => {
    render(<ExerciseImage src={undefined} alt="Pompes" emoji="💪" />);
    expect(screen.getByText('💪')).toBeInTheDocument();
  });
});
