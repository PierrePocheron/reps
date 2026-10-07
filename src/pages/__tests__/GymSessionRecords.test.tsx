import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GymSession from '@/pages/GymSession';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useUserStore } from '@/store/userStore';
import * as gs from '@/firebase/gymSessions';

const toast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock('@/hooks/useKeepAwake', () => ({ useKeepAwake: () => {} }));
vi.mock('@/hooks/useHaptic', () => ({ useHaptic: () => ({ impact: vi.fn(), notification: vi.fn(), selection: vi.fn() }) }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/utils/restNotification', () => ({ scheduleRestEnd: vi.fn(), cancelRestEnd: vi.fn(), exactAlarmDenied: () => Promise.resolve(false), openExactAlarmSettings: vi.fn() }));
vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), updateUserStatsAfterSession: vi.fn(() => Promise.resolve()) }));
vi.mock('@/firebase/gymSessions', async (orig) => ({ ...(await orig<typeof import('@/firebase/gymSessions')>()), getUserGymSessions: vi.fn() }));

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
// best so far: bench 100 kg x 5 (estimated 1RM 116.7)
const HISTORY = [{ id: 'old', userId: 'u1', date: ts(new Date(2026, 9, 1)), duration: 3000, totalVolume: 500, totalSets: 1,
  exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ reps: 5, weight: 100, completed: true }] }] }];

const BENCH = { exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️' };
const setup = async (planned: { reps: number; weight: number }[], exercise = BENCH, history: unknown[] = HISTORY, backdate: unknown = null) => {
  vi.mocked(gs.getUserGymSessions).mockResolvedValue(history as never);
  useUserStore.setState({ user: { uid: 'u1', displayName: 'P' } as never });
  useGymSessionStore.setState({
    phase: 'execute', startTime: Date.now(), autoRest: false, showRpe: false, suggestLoad: false, backdate,
    exercises: [{ ...exercise, sets: planned.map((s) => ({ ...s, completed: false })) }],
  } as never);
  render(<MemoryRouter><GymSession /></MemoryRouter>);
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); // history loaded
};
const sets = () => useGymSessionStore.getState().exercises[0]!.sets;

describe('live trophies follow corrections', () => {
  beforeEach(() => toast.mockClear());

  it('a corrected typo loses its trophy and the real record later gets one', async () => {
    await setup([{ reps: 5, weight: 100 }, { reps: 5, weight: 105 }]);
    fireEvent.change(screen.getByLabelText('Répétitions, série 1'), { target: { value: '50' } }); // typo
    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    expect(sets()[0]!.isRecord).toBe(true);
    fireEvent.change(screen.getByLabelText('Répétitions, série 1'), { target: { value: '5' } }); // fixed: equals the best
    expect(sets()[0]!.isRecord).toBe(false);
    fireEvent.click(screen.getByLabelText('Valider la série 2')); // 105 x 5 beats 100 x 5
    expect(sets()[1]!.isRecord).toBe(true);
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it('a record set switched to warm-up no longer raises the bar for the next set', async () => {
    await setup([{ reps: 5, weight: 110 }, { reps: 5, weight: 105 }]);
    fireEvent.click(screen.getByLabelText('Valider la série 1')); // 110 x 5: trophy
    fireEvent.click(screen.getByLabelText(/Série 1 : normale, record personnel — changer le type/)); // → warm-up
    expect(sets()[0]).toMatchObject({ type: 'warmup', isRecord: false });
    fireEvent.click(screen.getByLabelText('Valider la série 2')); // 105 x 5 still beats the history
    expect(sets()[1]!.isRecord).toBe(true);
  });

  it('switching reps ⇄ s after validating re-rates the set in the new unit', async () => {
    await setup([{ reps: 5, weight: 105 }]);
    fireEvent.click(screen.getByLabelText('Valider la série 1')); // 105 x 5 beats 100 x 5
    expect(sets()[0]!.isRecord).toBe(true);
    fireEvent.click(screen.getAllByLabelText('Unité : répétitions, passer en secondes')[0]!); // 5 s: no timed history
    expect(sets()[0]!.isRecord).toBe(false);
  });

  it('replacing an exercise rates its validated sets against the new one', async () => {
    await setup([{ reps: 5, weight: 105 }], { exerciseId: 'import_presse', name: 'Presse', emoji: '🏋️' });
    fireEvent.click(screen.getByLabelText('Valider la série 1')); // never done: no trophy
    expect(sets()[0]!.isRecord).toBeFalsy();
    fireEvent.click(screen.getByLabelText('Presse : voir la fiche et ta progression'));
    fireEvent.click(screen.getByText(/Remplacer par un autre exercice/));
    fireEvent.change(screen.getByPlaceholderText('Rechercher…'), { target: { value: 'developpe couche' } });
    fireEvent.click(screen.getByText('Développé couché'));
    expect(useGymSessionStore.getState().exercises[0]!.exerciseId).toBe('bench_press');
    expect(sets()[0]!.isRecord).toBe(true); // 105 x 5 beats the 100 x 5 of the bench history
  });
});

describe('trophies of a forgotten (backdated) session', () => {
  beforeEach(() => toast.mockClear());
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(18, 0, 0, 0); return d; };
  // bench 110 x 5 two days ago, 90 x 5 six days ago; the forgotten session was four days ago
  const history = [[2, 110], [6, 90]].map(([ago, weight]) => ({ ...HISTORY[0]!, id: `h${ago}`, date: ts(daysAgo(ago!)),
    exercises: [{ ...HISTORY[0]!.exercises[0]!, sets: [{ reps: 5, weight: weight!, completed: true }] }] }));
  const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

  it('are rated against the sessions dated before it, not a later one', async () => {
    await setup([{ reps: 5, weight: 100 }], BENCH, history, { at: daysAgo(4).getTime(), duration: 3600 });
    fireEvent.click(screen.getByLabelText('Valider la série 1')); // beats 90 x 5, not the later 110 x 5
    expect(sets()[0]!.isRecord).toBe(true);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nouveau record ! 🏆' }));
  });

  it('follow the date set after the sets are validated, and back to now', async () => {
    await setup([{ reps: 5, weight: 100 }], BENCH, history);
    fireEvent.click(screen.getByLabelText('Valider la série 1'));
    expect(sets()[0]!.isRecord).toBeFalsy(); // today: 110 x 5 two days ago is better
    fireEvent.click(screen.getByText(/Séance faite plus tôt/));
    fireEvent.change(screen.getByLabelText('Début de la séance'), { target: { value: localInput(daysAgo(4)) } });
    fireEvent.click(screen.getByRole('button', { name: 'Valider' }));
    expect(sets()[0]!.isRecord).toBe(true);
    fireEvent.click(screen.getByText(/Enregistrée le/));
    fireEvent.click(screen.getByRole('button', { name: 'Maintenant' }));
    expect(sets()[0]!.isRecord).toBe(false);
  });
});
