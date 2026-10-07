import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSession } from '../useSession';
import { useSessionStore } from '@/store/sessionStore';

describe('useSession', () => {
  it('hasExercise ignores case: « pompes » is flagged as a duplicate of « Pompes »', () => {
    useSessionStore.setState({ exercises: [{ name: 'Pompes', emoji: '🔥', reps: 0 }] });
    const { result } = renderHook(() => useSession());
    expect(result.current.hasExercise('pompes')).toBe(true);
    expect(result.current.hasExercise('Squats')).toBe(false);
  });

  it('a custom « pompes » is the library « Pompes » (same row, kcal and muscles in later stats)', () => {
    useSessionStore.setState({ exercises: [] });
    const { result } = renderHook(() => useSession());
    act(() => result.current.addCustomExercise('pompes', '🔥'));
    expect(useSessionStore.getState().exercises).toEqual([{ name: 'Pompes', emoji: '💪', reps: 0, met: 4.5 }]);
  });
});
