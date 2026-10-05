import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

const db = vi.hoisted(() => ({ getFriendsDetails: vi.fn(), getLeaderboardStats: vi.fn() }));
vi.mock('@/firebase/firestore', () => ({ ...db, onUserStatsComputed: vi.fn() }));
vi.mock('@/components/layout/PageLayout', () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/AdSpace', () => ({ AdSpace: () => null }));

import Leaderboard from '../Leaderboard';

const person = (uid: string, name: string, totalReps = 0) => ({ uid, displayName: name, firstName: name, totalReps, totalSessions: 0, totalCalories: 0, badges: [], friends: [] });
const row = (userId: string, totalReps: number) => ({ userId, totalReps, totalSessions: 0, totalCalories: 0 });
const ranks = () => screen.getAllByText(/^\d+$/).map((el) => el.textContent);

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUserStore.setState({ user: { ...person('me', 'Moi'), friends: ['alice', 'ghost', 'bob'] } as never });
    db.getFriendsDetails.mockResolvedValue([person('alice', 'Alice', 50), person('bob', 'Bob', 0)]); // ghost: deleted account
  });

  it('ranks the players shown without gaps (a friend with no profile no longer takes a rank)', async () => {
    db.getLeaderboardStats.mockResolvedValue([row('ghost', 80), row('alice', 50), row('bob', 30), row('me', 0)]);
    render(<BrowserRouter><Leaderboard /></BrowserRouter>);
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Semaine' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Semaine' }));
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
    // Alice 🏆, Bob 🥈, then me off the podium (0 reps): rank 3, not 4 (the hidden ghost row used to take #1)
    expect(ranks()).toContain('3');
    expect(ranks()).not.toContain('4');
  });

  it('a slower request of the previous tab does not overwrite the new tab', async () => {
    let finishDaily!: (v: unknown) => void;
    db.getLeaderboardStats.mockImplementation((_ids: string[], period: string) => (period === 'daily'
      ? new Promise((r) => { finishDaily = r; })
      : Promise.resolve([row('bob', 42), row('alice', 0), row('me', 0)])));
    render(<BrowserRouter><Leaderboard /></BrowserRouter>);
    for (const tab of ['Jour', 'Semaine']) {
      fireEvent.mouseDown(screen.getByRole('tab', { name: tab }));
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      await act(async () => {});
    }
    await waitFor(() => expect(screen.getByText(/\b42\b/)).toBeInTheDocument());
    await act(async () => { finishDaily([row('alice', 7), row('bob', 0), row('me', 0)]); });
    expect(screen.getByText(/\b42\b/)).toBeInTheDocument(); // weekly numbers stay
    expect(screen.queryByText(/^7\b/)).not.toBeInTheDocument();
  });
});
