import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

const db = vi.hoisted(() => ({
  getFriendsDetails: vi.fn(async () => [{ uid: 'alice', displayName: 'Alice', totalReps: 0, totalSessions: 0, badges: [], friends: ['me'] }]),
  getFriendsActivity: vi.fn(async () => [{ type: 'session', sessionId: 's1', userId: 'alice', totalReps: 20, exercises: [], date: { toDate: () => new Date() }, createdAt: { toDate: () => new Date() } }]),
}));
vi.mock('@/firebase/firestore', () => ({
  ...db, onUserStatsComputed: vi.fn(), searchUsers: vi.fn(), sendFriendRequest: vi.fn(), acceptFriendRequest: vi.fn(),
  declineFriendRequest: vi.fn(), removeFriend: vi.fn(),
}));
vi.mock('@/components/layout/PageLayout', () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/Kudos', () => ({ KudosButton: () => null }));
vi.mock('@/components/FriendTemplatesDialog', () => ({ FriendTemplatesDialog: () => null }));

import Friends from '../Friends';

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

  it('shows the empty feed once the last friend is removed (the old items left a blank area)', async () => {
    useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends: ['alice'] } as never, friendRequests: [] } as never);
    render(<BrowserRouter><Friends /></BrowserRouter>);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { useUserStore.setState({ user: { uid: 'me', displayName: 'Moi', friends: [] } as never }); });
    expect(screen.getByText(/Ton fil est vide/)).toBeInTheDocument();
  });
});
