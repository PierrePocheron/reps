import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import History from '@/pages/History';
import { useUserStore } from '@/store/userStore';
import { useSettingsStore } from '@/store/settingsStore';
import { createUserTemplate } from '@/firebase/templates';
import { updateSession, updateUserStatsAfterSession } from '@/firebase/firestore';

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
const gym = (id: string, day: number, exerciseIds: string[]) => ({
  sessionId: id, userId: 'u1', date: ts(new Date(2026, 9, day)), duration: 3000, totalVolume: 500, totalSets: 1,
  exercises: exerciseIds.map((e) => ({ exerciseId: e, name: e.toUpperCase(), emoji: '🏋️', sets: [{ reps: 5, weight: 100, completed: true }] })),
});
let GYM: object[] = []; // loose: tests add fields (timed, title…) the builder does not set
let RENFO: object[] = [];
let LIMIT = 0;
const toast = vi.fn();

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useSessionHistory', () => ({ useSessionHistory: (n: number) => { LIMIT = n; return { sessions: RENFO, gymSessions: GYM, loading: false, error: false, refetch: () => {} }; } }));
vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), deleteSession: vi.fn(), updateSession: vi.fn(), updateUserStatsAfterSession: vi.fn(() => Promise.resolve()) }));
vi.mock('@/firebase/gymSessions', () => ({ deleteGymSession: vi.fn(() => Promise.resolve()), updateGymSession: vi.fn() }));
vi.mock('@/firebase/templates', () => ({ createUserTemplate: vi.fn() }));

const cards = () => screen.queryAllByRole('button', { name: /^Refaire la séance du / });
const openMenu = async (item: string) => {
  fireEvent.pointerDown(screen.getAllByRole('button', { name: /^Actions de la séance du / })[0]!, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click(await screen.findByText(item));
};

function Url() {
  return <output data-testid="url">{useNavigationType()} {useLocation().search}</output>;
}

describe('History', () => {
  beforeEach(() => {
    RENFO = [];
    toast.mockClear();
    vi.mocked(updateUserStatsAfterSession).mockReset().mockImplementation(() => Promise.resolve()); // also called on mount (streak)
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

  it('the dropped filter stays dropped when older sessions of that exercise load (« charger plus »)', async () => {
    GYM = [gym('A', 3, ['bench']), gym('B', 2, ['bench']), gym('C', 1, ['squat'])];
    const { rerender } = render(<MemoryRouter><History /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Filtrer les séances par exercice'), { target: { value: 'squat' } });
    await openMenu('Supprimer');
    await act(async () => { fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Supprimer' })); });
    GYM = [...GYM, gym('D', 0, ['squat'])]; // an older squat session arrives
    rerender(<MemoryRouter><History /></MemoryRouter>);
    expect(cards()).toHaveLength(3);
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

  it('« Enregistrer comme modèle » suggests the session title as the name', async () => {
    GYM = [{ ...gym('A', 3, ['bench']), title: 'Push A' }];
    render(<MemoryRouter><History /></MemoryRouter>);
    await openMenu('Enregistrer comme modèle');
    expect(await screen.findByRole('textbox', { name: 'Nom du modèle' })).toHaveValue('Push A');
  });

  it('a long session title is suggested as the name the template is stored under (40 characters)', async () => {
    const title = 'Haut du corps lourd : pecs, épaules et triceps'; // 46: session titles go up to 60
    GYM = [{ ...gym('A', 3, ['bench']), title }];
    vi.mocked(createUserTemplate).mockResolvedValueOnce(undefined as never);
    render(<MemoryRouter><History /></MemoryRouter>);
    await openMenu('Enregistrer comme modèle');
    expect(await screen.findByRole('textbox', { name: 'Nom du modèle' })).toHaveValue(title.slice(0, 40));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' })); });
    const stored = vi.mocked(createUserTemplate).mock.lastCall?.[1].name;
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: `« ${stored} » est dans tes modèles.` }));
  });

  it('a saved template opens on the Muscu tab of the Templates page', async () => {
    GYM = [gym('A', 3, ['bench'])];
    localStorage.removeItem('reps_templates_tab'); // Templates then opens on Renfo, where the new template is not
    vi.mocked(createUserTemplate).mockResolvedValueOnce(undefined as never);
    render(<MemoryRouter><History /></MemoryRouter>);
    await openMenu('Enregistrer comme modèle');
    await act(async () => { fireEvent.click(await screen.findByRole('button', { name: 'Enregistrer' })); });
    expect(localStorage.getItem('reps_templates_tab')).toBe('musculation');
  });

  it('a slow stats recompute after a delete leaves the next delete dialog usable', async () => {
    GYM = [gym('A', 3, ['bench']), gym('B', 2, ['bench'])];
    vi.mocked(updateUserStatsAfterSession).mockImplementation(() => new Promise(() => {})); // offline: still recomputing
    render(<MemoryRouter><History /></MemoryRouter>);
    await openMenu('Supprimer');
    await act(async () => { fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Supprimer' })); });
    await openMenu('Supprimer');
    expect(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Annuler' })).toBeEnabled();
  });

  it('a failed stats recompute does not report a done delete or renfo edit as failed', async () => {
    GYM = [gym('A', 3, ['bench'])];
    RENFO = [{ sessionId: 'R', userId: 'u1', date: ts(new Date(2026, 9, 3)), duration: 600, totalReps: 40, exercises: [{ name: 'Squats', emoji: '🦵', reps: 40 }] }];
    vi.mocked(updateUserStatsAfterSession).mockRejectedValue(new Error('offline'));
    vi.mocked(updateSession).mockResolvedValueOnce({ exercises: [{ name: 'Squats', emoji: '🦵', reps: 40 }], totalReps: 40, totalCalories: 0 } as never);
    render(<MemoryRouter><History /></MemoryRouter>);
    await openMenu('Supprimer');
    await act(async () => { fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Supprimer' })); });
    fireEvent.click(screen.getByRole('tab', { name: /Renfo/ }));
    await openMenu('Modifier');
    await act(async () => { fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Enregistrer' })); });
    expect(toast.mock.calls.map(([t]) => t.title)).toEqual(['Séance supprimée', 'Séance modifiée']);
  });

  it('each card names its session on the menu and « Refaire » buttons', () => {
    GYM = [gym('A', 3, ['bench']), gym('B', 2, ['bench'])];
    render(<MemoryRouter><History /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Actions de la séance du samedi 3 octobre 2026 à 00:00' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refaire la séance du vendredi 2 octobre 2026 à 00:00' })).toBeInTheDocument();
  });

  it('restores the tab, filter and loaded count from the URL (back, reload)', () => {
    GYM = [gym('A', 3, ['bench']), gym('B', 2, ['bench']), gym('C', 1, ['squat'])];
    const { unmount } = render(<MemoryRouter initialEntries={['/history?ex=squat&n=300']}><History /></MemoryRouter>);
    expect(screen.getByLabelText('Filtrer les séances par exercice')).toHaveValue('squat');
    expect(cards()).toHaveLength(1);
    expect(LIMIT).toBe(300);
    unmount();
    render(<MemoryRouter initialEntries={['/history?tab=records']}><History /></MemoryRouter>);
    expect(screen.getByRole('tab', { name: /Records/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('writes the tab, filter and loaded count to the URL without stacking history entries', () => {
    GYM = Array.from({ length: 100 }, (_, i) => gym(`G${i}`, 1, [i ? 'bench' : 'squat']));
    render(<MemoryRouter initialEntries={['/history']}><History /><Url /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Filtrer les séances par exercice'), { target: { value: 'squat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Voir les séances plus anciennes' }));
    fireEvent.click(screen.getByRole('tab', { name: /Records/ }));
    expect(screen.getByTestId('url')).toHaveTextContent('REPLACE ?ex=squat&n=200&tab=records');
    fireEvent.click(screen.getByRole('tab', { name: /Muscu/ }));
    expect(screen.getByTestId('url')).toHaveTextContent(/^REPLACE \?ex=squat&n=200$/); // the default tab stays out of the URL
  });

  it('the card sums up an exercise with its heaviest set (longest when timed), not the first one', () => {
    const done = (reps: number, weight: number, type?: 'warmup') => ({ reps, weight, completed: true, type });
    GYM = [{ ...gym('A', 3, []), exercises: [
      { exerciseId: 'bench', name: 'BENCH', emoji: '🏋️', sets: [done(10, 40, 'warmup'), done(8, 60), done(5, 82.5)] },
      { exerciseId: 'plank', name: 'PLANK', emoji: '🧘', timed: true, sets: [done(60, 0), done(75, 0)] },
      { exerciseId: 'dips', name: 'DIPS', emoji: '💪', sets: [done(12, 0)] },
    ] }];
    render(<MemoryRouter><History /></MemoryRouter>);
    expect(screen.getByText('2 séries · 82,5 kg max · 1 échauff.')).toBeInTheDocument();
    expect(screen.getByText('2 séries · 75 s max')).toBeInTheDocument();
    expect(screen.getByText('1 série · poids du corps')).toBeInTheDocument();
  });

  it('a renfo card leaves out the exercises you skipped (0 reps)', () => {
    RENFO = [{ sessionId: 'R', userId: 'u1', date: ts(new Date(2026, 9, 3)), duration: 600, totalReps: 40, totalCalories: 0,
      exercises: [{ name: 'Squats', emoji: '🦵', reps: 40 }, { name: 'Pompes', emoji: '💪', reps: 0 }] }];
    render(<MemoryRouter><History /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: /Renfo/ }));
    expect(screen.getByText('Squats')).toBeInTheDocument();
    expect(screen.queryByText('Pompes')).not.toBeInTheDocument();
  });

  it('the filter counts sessions with a French plural', () => {
    GYM = [gym('A', 3, ['bench', 'squat'])];
    render(<MemoryRouter><History /></MemoryRouter>);
    expect(screen.getByRole('option', { name: 'Tous les exercices (1 séance)' })).toBeInTheDocument();
  });

  it('counts capped by the loaded page say there are more (« 100+ »)', () => {
    GYM = Array.from({ length: 100 }, (_, i) => gym(`G${i}`, 1, [i ? 'bench' : 'squat']));
    RENFO = Array.from({ length: 100 }, (_, i) => ({ sessionId: `R${i}`, userId: 'u1', date: ts(new Date(2026, 9, 1)), duration: 60, totalReps: 1, exercises: [] }));
    render(<MemoryRouter><History /></MemoryRouter>);
    expect(screen.getByRole('tab', { name: /Muscu/ })).toHaveTextContent('100+');
    expect(screen.getByRole('tab', { name: /Renfo/ })).toHaveTextContent('100+');
    expect(screen.getByRole('option', { name: 'Tous les exercices (100+ séances)' })).toBeInTheDocument();
  });

  it('Records says which set it keeps and names the estimate « 1RM estimé », like the progress sheet', () => {
    GYM = [gym('A', 3, ['bench'])]; // 5 × 100 kg → ~117 kg estimated
    render(<MemoryRouter><History /></MemoryRouter>);
    fireEvent.click(screen.getByRole('tab', { name: /Records/ }));
    expect(screen.getByText(/^Ta série au plus gros volume \(charge × reps\) par exercice\./)).toBeInTheDocument();
    expect(screen.getByText('1RM estimé')).toBeInTheDocument();
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

