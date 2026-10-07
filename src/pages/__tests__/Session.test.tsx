import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const s = vi.hoisted(() => ({ isActive: true, totalReps: 40, startSession: vi.fn(), exercises: [] as { name: string; emoji: string; reps: number; met?: number }[] }));
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    isActive: s.isActive, startTime: Date.now(), exercises: s.exercises, totalReps: s.isActive ? s.totalReps : 0, startSession: s.startSession,
    endSession: vi.fn(), resetSession: vi.fn(), addExercise: vi.fn(), removeExercise: vi.fn(), addReps: vi.fn(),
    hasExercise: () => false, getAvailableExercises: () => [], addCustomExercise: vi.fn(),
  }),
}));
vi.mock('@/hooks/useKeepAwake', () => ({ useKeepAwake: () => {} }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock('@/hooks/useHaptic', () => ({ useHaptic: () => ({ impact: vi.fn(), notification: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
// Latest session: 30 reps; the one before 1 October: 20 reps
const getLastSession = vi.hoisted(() => vi.fn(async (_uid: string, before?: Date) => ({ totalReps: before && before < new Date(2026, 9, 1, 19) ? 20 : 30 })));
vi.mock('@/firebase/firestore', () => ({ getUserSessions: vi.fn(async () => []), getLastSession, onUserStatsComputed: vi.fn() }));

import Session from '../Session';
import { useUserStore } from '@/store/userStore';
import { useSessionStore } from '@/store/sessionStore';

describe('Session page', () => {
  it('after the 2-hour auto-finish it says so and offers a new session (the page went blank)', () => {
    const { rerender } = render(<MemoryRouter><Session /></MemoryRouter>);
    s.isActive = false; // saved by the auto-finish, no summary on this page
    rerender(<MemoryRouter><Session /></MemoryRouter>);
    expect(screen.getByText(/enregistrée automatiquement/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle séance' }));
    expect(s.startSession).toHaveBeenCalled();
  });

  it('live kcal of a library exercise use its category MET, like the saved session', () => {
    s.isActive = true;
    s.exercises = [{ name: 'Sauts écartés', emoji: '🏃', reps: 100, met: 7 }];
    useUserStore.setState({ user: { uid: 'u1', weight: 75, height: 175, gender: 'male' } as never });
    render(<MemoryRouter><Session /></MemoryRouter>);
    expect(screen.getByText('31 kcal')).toBeInTheDocument(); // the 4.0 fallback showed 18
  });

  it('the recap counts only the exercises done, not the skipped ones of a template', async () => {
    s.isActive = true;
    s.exercises = [{ name: 'Pompes', emoji: '💪', reps: 30 }, { name: 'Tractions', emoji: '🧗', reps: 0 }, { name: 'Abdos', emoji: '🍫', reps: 25 }];
    const { rerender } = render(<MemoryRouter><Session /></MemoryRouter>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Terminer la séance/ })); });
    s.isActive = false; // endSession emptied the store
    rerender(<MemoryRouter><Session /></MemoryRouter>);
    expect(screen.getByText('Exercices').nextElementSibling).toHaveTextContent('2');
  });

  it('the recap of a forgotten session compares it with the session dated before it, not with the latest', async () => {
    s.isActive = true;
    s.totalReps = 40;
    s.exercises = [{ name: 'Pompes', emoji: '💪', reps: 40 }];
    useUserStore.setState({ user: { uid: 'u1', displayName: 'P' } as never });
    useSessionStore.setState({ backdate: { at: new Date(2026, 9, 1, 18).getTime(), duration: 1200 } });
    const { rerender } = render(<MemoryRouter><Session /></MemoryRouter>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Terminer la séance/ })); });
    s.isActive = false;
    rerender(<MemoryRouter><Session /></MemoryRouter>);
    expect(screen.getByText(/\+100 % de reps par rapport à ta dernière séance/)).toBeInTheDocument(); // 40 vs 20, not +33 % vs 30
    useSessionStore.setState({ backdate: null });
  });
});
