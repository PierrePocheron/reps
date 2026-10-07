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
const cardOf = (name: string) => screen.getByRole('heading', { name }).closest('.overflow-hidden')!;
const openTab = async (name: string) => {
  fireEvent.mouseDown(screen.getByRole('tab', { name }));
  fireEvent.click(screen.getByRole('tab', { name }));
  await act(async () => {});
};

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
    // the hidden ghost row used to take #1: Alice got 🥈
    expect(cardOf('Alice').querySelector('.lucide-trophy')).not.toBeNull();
  });

  it('equal totals share a rank and 0 reps shows « – » instead of a rank', async () => {
    db.getLeaderboardStats.mockResolvedValue([row('alice', 30), row('bob', 30), row('me', 0)]);
    render(<BrowserRouter><Leaderboard /></BrowserRouter>);
    await openTab('Semaine');
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
    expect(cardOf('Alice').querySelector('.lucide-trophy')).not.toBeNull();
    expect(cardOf('Bob').querySelector('.lucide-trophy')).not.toBeNull(); // was 🥈 for the same score
    expect(cardOf('Moi')).toHaveTextContent(/^–/);
  });

  it('on Total too, nobody ranked first with 0 reps and the « nobody moved » line shows', async () => {
    db.getFriendsDetails.mockResolvedValue([person('alice', 'Alice'), person('bob', 'Bob')]);
    render(<BrowserRouter><Leaderboard /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
    expect(screen.getByText(/Personne n'a encore bougé/)).toBeInTheDocument();
    expect(screen.queryAllByText(/^\d+$/).filter((el) => el.textContent !== '0')).toHaveLength(0); // only the 0 reps, no rank
    expect(screen.getAllByText('–')).toHaveLength(3);
  });

  it('with no friend, the empty state is the whole screen (no « nobody moved », no lone row ranked 1)', async () => {
    useUserStore.setState({ user: person('me', 'Moi') as never });
    db.getFriendsDetails.mockResolvedValue([]);
    db.getLeaderboardStats.mockResolvedValue([row('me', 0)]);
    render(<BrowserRouter><Leaderboard /></BrowserRouter>);
    await act(async () => {});
    expect(screen.getByText("Personne à défier pour l'instant")).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Moi' })).not.toBeInTheDocument();
    await openTab('Jour');
    expect(screen.getByText("Personne à défier pour l'instant")).toBeInTheDocument();
    expect(screen.queryByText(/Personne n'a encore bougé/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Moi' })).not.toBeInTheDocument();
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
