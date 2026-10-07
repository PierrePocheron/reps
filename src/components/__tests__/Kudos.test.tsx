import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KudosBanner } from '../Kudos';
import { useUserStore } from '@/store/userStore';
import { getUnreadKudos } from '@/firebase/kudos';
import type { Notification } from '@/firebase/types';

vi.mock('@/firebase/kudos', () => ({ getKudos: vi.fn(), getUnreadKudos: vi.fn(), giveKudos: vi.fn(), markKudosSeen: vi.fn(), removeKudos: vi.fn() }));

const kudos = (id: string, fromName: string, sessionId?: string) => ({ id, fromName, sessionId, type: 'kudos', read: false }) as Notification;

describe('KudosBanner', () => {
  beforeEach(() => useUserStore.setState({ user: { uid: 'me' } as never }));

  it('says « ta séance » for one session', async () => {
    vi.mocked(getUnreadKudos).mockResolvedValue([kudos('n1', 'alice', 's1'), kudos('n2', 'bob', 's1')]);
    render(<KudosBanner />);
    expect(await screen.findByText(/ont encouragé ta séance$/)).toBeInTheDocument();
  });

  it('counts the sessions when several were encouraged (it said « ta séance »)', async () => {
    vi.mocked(getUnreadKudos).mockResolvedValue([kudos('n1', 'alice', 's1'), kudos('n2', 'alice', 's2')]);
    render(<KudosBanner />);
    expect(await screen.findByText(/a encouragé tes 2 séances$/)).toBeInTheDocument();
  });

  it('older notifications without a session id do not inflate the count', async () => {
    vi.mocked(getUnreadKudos).mockResolvedValue([kudos('n1', 'alice'), kudos('n2', 'bob')]);
    render(<KudosBanner />);
    expect(await screen.findByText(/ont encouragé ta séance$/)).toBeInTheDocument();
  });
});
