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
vi.mock('@/hooks/useHaptic', () => ({ useHaptic: () => ({ impact: vi.fn(), notification: vi.fn() }) }));
vi.mock('@/hooks/useSound', () => ({ useSound: () => ({ play: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('@/utils/restNotification', () => ({ scheduleRestEnd: vi.fn(), cancelRestEnd: vi.fn(), exactAlarmDenied: () => Promise.resolve(false), openExactAlarmSettings: vi.fn() }));
vi.mock('@/firebase/firestore', () => ({ onUserStatsComputed: vi.fn(), updateUserStatsAfterSession: vi.fn(() => Promise.resolve()) }));
vi.mock('@/firebase/gymSessions', async (orig) => ({ ...(await orig<typeof import('@/firebase/gymSessions')>()), getUserGymSessions: vi.fn() }));

const ts = (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() });
// best so far: bench 100 kg x 5 (estimated 1RM 116.7)
const HISTORY = [{ id: 'old', userId: 'u1', date: ts(new Date(2026, 9, 1)), duration: 3000, totalVolume: 500, totalSets: 1,
  exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ reps: 5, weight: 100, completed: true }] }] }];

const setup = async (planned: { reps: number; weight: number }[]) => {
  vi.mocked(gs.getUserGymSessions).mockResolvedValue(HISTORY as never);
  useUserStore.setState({ user: { uid: 'u1', displayName: 'P' } as never });
  useGymSessionStore.setState({
    phase: 'execute', startTime: Date.now(), autoRest: false, showRpe: false, suggestLoad: false, backdate: null,
    exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: planned.map((s) => ({ ...s, completed: false })) }],
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
});
