import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { formatNumber } from '@/utils/formatters';

const db = vi.hoisted(() => ({
  getFriendsDetails: vi.fn(async () => [{ uid: 'alice', displayName: 'Alice', totalReps: 0, totalSessions: 0, badges: [], friends: ['me'] }]),
  getFriendsActivity: vi.fn(async () => [{ type: 'session', sessionId: 's1', userId: 'alice', totalReps: 20, exercises: [], date: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() } }]),
  searchUsers: vi.fn(async () => [] as unknown[]),
  sendFriendRequest: vi.fn(async () => {}),
  acceptFriendRequest: vi.fn(async () => {}),
  removeFriend: vi.fn(async () => {}),
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock('@/firebase/firestore', () => ({ ...db, onUserStatsComputed: vi.fn(), declineFriendRequest: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/components/layout/PageLayout', () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/Kudos', () => ({ KudosButton: () => null }));
vi.mock('@/components/FriendTemplatesDialog', () => ({ FriendTemplatesDialog: () => null }));

import Friends from '../Friends';

// Testing Library collapses the narrow no-break space of fr-FR numbers into a plain space
const num = (n: number) => formatNumber(n).replace(/\s/g, ' ');
const bobRequest = { id: 'bob_me', fromUserId: 'bob', fromDisplayName: 'Bob', toUserId: 'me', status: 'pending' };
const renderFriends = (friends: string[] = ['alice'], friendRequests: unknown[] = []) => {
  useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends } as never, friendRequests } as never);
  return render(<BrowserRouter><Friends /></BrowserRouter>);
};

const setOnline = (on: boolean) => Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => on });

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { setOnline(true); });

describe('Friends tabs', () => {
  it('opens on the friends tab when a request is pending (the nav badge led to an empty feed)', async () => {
    renderFriends([], [bobRequest]);
    expect(await screen.findByText('Demandes en attente')).toBeInTheDocument();
  });

  it('opens on the activity tab otherwise', async () => {
    renderFriends([]);
    expect(await screen.findByText(/Ton fil est vide/)).toBeInTheDocument();
  });
});

describe('Friends activity', () => {
  it('lists only the exercises done: no « + 2 autres exercices » for the skipped ones of a template', async () => {
    const ex = (name: string, reps: number) => ({ name, emoji: '💪', reps });
    db.getFriendsActivity.mockResolvedValueOnce([{ type: 'session', sessionId: 's2', userId: 'alice', totalReps: 95,
      exercises: [ex('Pompes', 30), ex('Squats', 40), ex('Tractions', 0), ex('Burpees', 0), ex('Abdos', 25)],
      date: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() } }] as never);
    useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends: ['alice'] } as never, friendRequests: [] } as never);
    render(<BrowserRouter><Friends /></BrowserRouter>);
    expect(await screen.findByText('Abdos')).toBeInTheDocument();
    expect(screen.queryByText('Tractions')).not.toBeInTheDocument();
    expect(screen.queryByText(/autres? exercices?/)).not.toBeInTheDocument();
  });

  it('names both people on the new-friend card, and says « toi » when it is the viewer', async () => {
    const event = (id: string, friendId: string, friendName: string) => ({ type: 'new_friend', id, userId: 'alice', friendId, friendName, createdAt: { toDate: () => new Date() } });
    db.getFriendsActivity.mockResolvedValueOnce([event('e1', 'me', 'Moi'), event('e2', 'bob', 'Bob')] as never);
    renderFriends();
    const line = (text: string) => (_: string, el: Element | null) => el?.tagName === 'P' && el.textContent === text;
    expect(await screen.findByText(line('Alice et toi êtes maintenant amis'))).toBeInTheDocument();
    expect(screen.getByText(line('Alice est maintenant ami avec Bob'))).toBeInTheDocument();
    expect(screen.queryByText('Nouvelle connexion')).not.toBeInTheDocument();
  });

  it('writes feed numbers the French way: thousands separator, rounded kcal, « rep » singular', async () => {
    const day = { toDate: () => new Date() };
    db.getFriendsActivity.mockResolvedValueOnce([
      { type: 'session', sessionId: 's3', userId: 'alice', totalReps: 1050, totalCalories: 120.4, exercises: [{ name: 'Pompes', emoji: '💪', reps: 1050 }], date: day, createdAt: day },
      { type: 'session', sessionId: 's4', userId: 'alice', totalReps: 1, exercises: [], date: day, createdAt: day },
    ] as never);
    renderFriends();
    expect(await screen.findAllByText(num(1050))).toHaveLength(2); // session total + the exercise line
    expect(screen.getByText('120 kcal')).toBeInTheDocument();
    expect(screen.getByText('rep')).toBeInTheDocument();
  });

  it('shows the friend stats with French plurals (« 1 rep », not « 1 reps »)', async () => {
    db.getFriendsDetails.mockResolvedValueOnce([{ uid: 'alice', displayName: 'Alice', totalReps: 1, totalSessions: 1, badges: [], friends: ['me'] }] as never);
    renderFriends(['alice'], [bobRequest]);
    expect(await screen.findByText('1 séance • 1 rep')).toBeInTheDocument();
  });

  it('shows the empty feed once the last friend is removed (the old items left a blank area)', async () => {
    useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends: ['alice'] } as never, friendRequests: [] } as never);
    render(<BrowserRouter><Friends /></BrowserRouter>);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends: [] } as never }); });
    expect(screen.getByText(/Ton fil est vide/)).toBeInTheDocument();
  });
});

describe('Friends removal', () => {
  const openRemoveDialog = async () => {
    renderFriends(['alice'], [bobRequest]);
    fireEvent.pointerDown(await screen.findByRole('button', { name: 'Options pour Alice' }), { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(await screen.findByText('Retirer'));
  };

  it('says « retirer » everywhere and names the friend in the toast', async () => {
    await openRemoveDialog();
    expect(screen.getByText('Retirer cet ami ?')).toBeInTheDocument();
    expect(screen.getByText(/Tu pourras l'ajouter de nouveau plus tard\./)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retirer' })); });
    expect(db.removeFriend).toHaveBeenCalledWith('me', 'alice');
    expect(toast).toHaveBeenCalledWith({ title: 'Ami retiré', description: 'Alice ne fait plus partie de tes amis.' });
  });

  it('keeps both dialog buttons disabled while removing (« Annuler » looked like it undid it)', async () => {
    db.removeFriend.mockReturnValueOnce(new Promise(() => {}));
    await openRemoveDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(screen.getByRole('button', { name: 'Retirer' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Annuler' })).toBeDisabled();
  });

  it('refuses to remove a friend offline, with a clear toast', async () => {
    setOnline(false);
    await openRemoveDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(db.removeFriend).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Hors ligne' }));
  });
});

describe('Friends requests', () => {
  it('refuses to accept a request offline, with a clear toast', async () => {
    setOnline(false);
    renderFriends([], [bobRequest]);
    fireEvent.click(await screen.findByRole('button', { name: 'Accepter la demande de Bob' }));
    expect(db.acceptFriendRequest).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Hors ligne' }));
  });
});
