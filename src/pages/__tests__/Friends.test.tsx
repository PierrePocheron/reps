import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

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

const bobRequest = { id: 'bob_me', fromUserId: 'bob', fromDisplayName: 'Bob', toUserId: 'me', status: 'pending' };
const renderFriends = (friends: string[] = ['alice'], friendRequests: unknown[] = []) => {
  useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends } as never, friendRequests } as never);
  return render(<BrowserRouter><Friends /></BrowserRouter>);
};

beforeEach(() => { vi.clearAllMocks(); });

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

  it('shows the empty feed once the last friend is removed (the old items left a blank area)', async () => {
    useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends: ['alice'] } as never, friendRequests: [] } as never);
    render(<BrowserRouter><Friends /></BrowserRouter>);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends: [] } as never }); });
    expect(screen.getByText(/Ton fil est vide/)).toBeInTheDocument();
  });
});
