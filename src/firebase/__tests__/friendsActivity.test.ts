import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDocs, query, where } from 'firebase/firestore';
import { getFriendsActivity } from '../firestore';

// Firestore `in` takes at most 10 values: each query answers for the friends it was given
beforeEach(() => {
  vi.mocked(where).mockImplementation(((field: string, op: string, value: unknown) => ({ field, op, value })) as never);
  vi.mocked(query).mockImplementation(((...parts: unknown[]) => parts) as never);
  vi.mocked(getDocs).mockImplementation((async (q: unknown) => {
    const ids = ((q as { op?: string; value?: string[] }[]).find((p) => p?.op === 'in')?.value) ?? [];
    return { docs: ids.map((uid, i) => ({ id: `${uid}-s`, data: () => ({ userId: uid, createdAt: { toDate: () => new Date(2026, 9, 4, 8, i) } }) })) };
  }) as never);
});

describe('getFriendsActivity', () => {
  it('covers every friend, not just the first 10', async () => {
    const friends = Array.from({ length: 12 }, (_, i) => `f${i + 1}`);
    const items = await getFriendsActivity(friends, 50);
    const users = new Set(items.map((a) => (a as { userId?: string }).userId));
    expect(users.has('f11')).toBe(true);
    expect(users.has('f12')).toBe(true);
  });

  it('a read failure is an error, not an empty feed', async () => {
    vi.mocked(getDocs).mockRejectedValue(new Error('offline'));
    await expect(getFriendsActivity(['f1'])).rejects.toThrow('offline');
  });
});
