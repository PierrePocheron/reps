import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExerciseImage } from '../ExerciseImage';
import { libraryImageUrl } from '@/utils/exerciseLibrary';

describe('ExerciseImage', () => {
  it("falls back to the emoji when the picture cannot load (offline: broken image and cut alt text)", () => {
    render(<ExerciseImage src="/exercises/bench.jpg" alt="Développé couché" emoji="🏋️" />);
    fireEvent.error(screen.getByRole('img', { name: 'Développé couché' }));
    expect(screen.queryByRole('img', { name: 'Développé couché' })).not.toBeInTheDocument();
    expect(screen.getByText('🏋️')).toBeInTheDocument();
  });

  it('loads only the app\'s own pictures and the exercise library CDN (a friend\'s link tracked whoever opened it)', () => {
    const shown = (src: string) => {
      const { unmount } = render(<ExerciseImage src={src} alt="Exo" emoji="💪" />);
      const img = screen.queryByRole('img', { name: 'Exo' });
      unmount();
      return !!img;
    };
    expect(shown('/exercises/bench.jpg')).toBe(true);
    expect(shown(libraryImageUrl({ media: '0001' } as never))).toBe(true);
    expect(shown('https://tracker.example/p.gif?id=1')).toBe(false);
    expect(shown('//tracker.example/p.gif')).toBe(false);
    expect(shown('/\\tracker.example/p.gif')).toBe(false);
    expect(shown('https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/../../other/repo/p.gif')).toBe(false);
  });

  it('shows the emoji when there is no picture', () => {
    render(<ExerciseImage src={undefined} alt="Pompes" emoji="💪" />);
    expect(screen.getByText('💪')).toBeInTheDocument();
  });
});
