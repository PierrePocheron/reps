import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ExerciseCard } from '../ExerciseCard';

const exercise = { name: 'Pompes', emoji: '🔥', reps: 10 };

describe('ExerciseCard long press', () => {
  afterEach(() => vi.useRealTimers());

  it('a short tap does not open the delete overlay even if the card re-renders meanwhile (session timer ticks every second)', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    const { rerender } = render(<ExerciseCard exercise={exercise} onAddReps={vi.fn()} onLongPress={onLongPress} />);
    fireEvent.touchStart(screen.getByText('Pompes'));
    act(() => vi.advanceTimersByTime(100));
    rerender(<ExerciseCard exercise={{ ...exercise }} onAddReps={vi.fn()} onLongPress={onLongPress} />);
    fireEvent.touchEnd(screen.getByText('Pompes'));
    act(() => vi.advanceTimersByTime(1000));
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('a real long press opens it', () => {
    vi.useFakeTimers();
    const onLongPress = vi.fn();
    render(<ExerciseCard exercise={exercise} onAddReps={vi.fn()} onLongPress={onLongPress} />);
    fireEvent.touchStart(screen.getByText('Pompes'));
    act(() => vi.advanceTimersByTime(600));
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});
