import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

vi.mock('@/firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/firebase/firestore')>()),
  getUserSessions: vi.fn(async () => []),
  updateUserStatsAfterSession: vi.fn(async () => {}),
}));
vi.mock('@/firebase/gymSessions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/firebase/gymSessions')>()),
  getUserGymSessions: vi.fn(async () => []),
  importGymSessions: vi.fn(async () => {}),
}));
vi.mock('@/utils/exerciseLibrary', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exerciseLibrary')>()),
  loadExerciseLibrary: vi.fn(async () => []),
}));

import Settings from '../Settings';
import { getUserSessions, updateUserStatsAfterSession } from '@/firebase/firestore';
import { getUserGymSessions } from '@/firebase/gymSessions';

const renderPage = () => render(<MemoryRouter><Settings /></MemoryRouter>);
const refreshStats = vi.fn(async () => {});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({ user: { uid: 'u1', displayName: 'Test' } as never, refreshStats });
  });

  it('opening the page reads no session: export and import read the whole history themselves', () => {
    renderPage();
    expect(getUserSessions).not.toHaveBeenCalled();
    expect(getUserGymSessions).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Exporter mes données/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Exporter mes séances/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Importer depuis Strong/ })).toBeEnabled();
  });

  it('an import recomputes the stats once and reads no page of history afterwards', async () => {
    const { container } = renderPage();
    const csv = [
      'Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
      '2026-10-02 18:05:00,Push,1h 5m,Bench Press,1,60,8,,,,,',
    ].join('\n');
    const file = Object.assign(new File([csv], 'strong.csv'), { text: async () => csv }); // jsdom's File has no text()
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Importer' }));
    await waitFor(() => expect(updateUserStatsAfterSession).toHaveBeenCalledWith('u1', 0));
    // the stats listener already hands the fresh stats to the store: no second full read
    expect(refreshStats).not.toHaveBeenCalled();
    // only the duplicate check's whole-history read, no page refetch
    expect(vi.mocked(getUserSessions).mock.calls).toEqual([['u1', 100_000, true]]);
  });
});
