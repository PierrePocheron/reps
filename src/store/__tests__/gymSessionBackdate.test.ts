import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/restNotification', () => ({ scheduleRestEnd: vi.fn(), cancelRestEnd: vi.fn() }));
vi.mock('@/firebase/gymSessions', async (orig) => ({ ...(await orig<typeof import('@/firebase/gymSessions')>()), createGymSession: vi.fn().mockResolvedValue('id') }));
vi.mock('@/firebase/firestore', async (orig) => ({ ...(await orig<typeof import('@/firebase/firestore')>()), updateUserStatsAfterSession: vi.fn().mockResolvedValue(undefined) }));

import { useGymSessionStore } from '../gymSessionStore';
import { useUserStore } from '../userStore';
import { createGymSession } from '@/firebase/gymSessions';

describe('gymSessionStore — séance oubliée (#58)', () => {
  it('enregistrée à la date et avec la durée saisies, puis oubliée ; jamais dans le futur', async () => {
    useUserStore.setState({ currentUser: { uid: 'u1' } as never });
    const at = Date.now() - 86_400_000;
    useGymSessionStore.setState({
      phase: 'execute', startTime: Date.now() - 5000,
      exercises: [{ exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: true }] }],
    });
    useGymSessionStore.getState().setBackdate({ at, duration: 3600 });
    useGymSessionStore.getState().setTitle('  Jambes  ');
    useGymSessionStore.getState().setSessionNote('genou sensible');
    await useGymSessionStore.getState().endSession();

    const saved = vi.mocked(createGymSession).mock.calls[0]![1];
    expect(saved.date.toDate().getTime()).toBe(at);
    expect(saved.duration).toBe(3600);
    expect(saved).toMatchObject({ title: 'Jambes', note: 'genou sensible' }); // #64
    expect(useGymSessionStore.getState().title).toBe('');
    expect(useGymSessionStore.getState().backdate).toBeNull();

    useGymSessionStore.getState().setBackdate({ at: Date.now() + 3_600_000, duration: 60 });
    expect(useGymSessionStore.getState().backdate!.at).toBeLessThanOrEqual(Date.now());
  });
});
