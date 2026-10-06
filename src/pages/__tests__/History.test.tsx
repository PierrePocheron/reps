import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import History from '@/pages/History';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { createUserTemplate } from '@/firebase/templates';

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
const gym = (id: string, day: number, exerciseIds: string[]) => ({
  sessionId: id, userId: 'u1', date: ts(new Date(2026, 9, day)), duration: 3000, totalVolume: 500, totalSets: 1,
  exercises: exerciseIds.map((e) => ({ exerciseId: e, name: e.toUpperCase(), emoji: '🏋️', sets: [{ reps: 5, weight: 100, completed: true }] })),
});
let GYM: ReturnType<typeof gym>[] = [];

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/hooks/useSessionHistory', () => ({ useSessionHistory: () => ({ sessions: [], gymSessions: GYM, loading: false, error: false, refetch: () => {} }) }));
vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), deleteSession: vi.fn(), updateSession: vi.fn(), updateUserStatsAfterSession: vi.fn(() => Promise.resolve()) }));
vi.mock('@/firebase/gymSessions', () => ({ deleteGymSession: vi.fn(() => Promise.resolve()), updateGymSession: vi.fn() }));
vi.mock('@/firebase/templates', () => ({ createUserTemplate: vi.fn() }));

const cards = () => screen.queryAllByRole('button', { name: 'Refaire cette séance' });
const openMenu = async (item: string) => {
  fireEvent.pointerDown(screen.getAllByRole('button', { name: 'Actions de la séance' })[0]!, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click(await screen.findByText(item));
};

describe('History', () => {
  beforeEach(() => {
    useUserStore.setState({ user: { uid: 'u1', displayName: 'P' } as never, refreshStats: vi.fn(() => Promise.resolve()) } as never);
  });

  it('deleting the only session of the filtered exercise shows every session again', async () => {
    GYM = [gym('A', 3, ['bench']), gym('B', 2, ['bench']), gym('C', 1, ['squat'])];
    render(<MemoryRouter><History /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Filtrer les séances par exercice'), { target: { value: 'squat' } });
    expect(cards()).toHaveLength(1);
    await openMenu('Supprimer');
    await act(async () => { fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Supprimer' })); });
    expect(cards()).toHaveLength(2);
  });

  it('a double tap on « Enregistrer » creates one template', async () => {
    GYM = [gym('A', 3, ['bench'])];
    vi.mocked(createUserTemplate).mockReturnValue(new Promise(() => {})); // slow network / offline: still saving
    render(<MemoryRouter><History /></MemoryRouter>);
    await openMenu('Enregistrer comme modèle');
    const save = await screen.findByRole('button', { name: 'Enregistrer' });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(createUserTemplate).toHaveBeenCalledTimes(1);
  });

  it('a library exercise keeps its photo in History and Records, and its how-to in the sheet', async () => {
    const lib = { exerciseId: 'lib_0001', name: 'Relevé de buste 3/4', emoji: '💪', imageUrl: 'https://cdn.example/lib_0001.jpg', sets: [{ reps: 15, weight: 0, completed: true }] };
    GYM = [{ ...gym('A', 3, []), exercises: [lib] }];
    useSettingsStore.setState({ language: 'fr' });
    render(<MemoryRouter><History /></MemoryRouter>);
    expect(screen.getByRole('img', { name: lib.name })).toHaveAttribute('src', lib.imageUrl);
    fireEvent.click(screen.getByRole('tab', { name: /Records/ }));
    expect(screen.getByRole('img', { name: lib.name })).toHaveAttribute('src', lib.imageUrl);
    fireEvent.click(screen.getByRole('button', { name: `${lib.name} : voir ta progression` }));
    expect(await screen.findByText(/Allonge-toi sur le dos/)).toBeInTheDocument();
  });
});

