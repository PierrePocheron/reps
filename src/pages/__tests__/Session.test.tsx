import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const s = vi.hoisted(() => ({ isActive: true, totalReps: 40, startSession: vi.fn() }));
vi.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    isActive: s.isActive, startTime: Date.now(), exercises: [], totalReps: s.isActive ? s.totalReps : 0, startSession: s.startSession,
    endSession: vi.fn(), resetSession: vi.fn(), addExercise: vi.fn(), removeExercise: vi.fn(), addReps: vi.fn(),
    hasExercise: () => false, getAvailableExercises: () => [], addCustomExercise: vi.fn(),
  }),
}));
vi.mock('@/hooks/useKeepAwake', () => ({ useKeepAwake: () => {} }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock('@/hooks/useHaptic', () => ({ useHaptic: () => ({ impact: vi.fn(), notification: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/firebase/firestore', () => ({ getUserSessions: vi.fn(async () => []), onUserStatsComputed: vi.fn() }));

import Session from '../Session';

describe('Session page', () => {
  it('after the 2-hour auto-finish it says so and offers a new session (the page went blank)', () => {
    const { rerender } = render(<MemoryRouter><Session /></MemoryRouter>);
    s.isActive = false; // saved by the auto-finish, no summary on this page
    rerender(<MemoryRouter><Session /></MemoryRouter>);
    expect(screen.getByText(/enregistrée automatiquement/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nouvelle séance' }));
    expect(s.startSession).toHaveBeenCalled();
  });
});
