import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runTransaction, Timestamp } from 'firebase/firestore';
import { validateChallengeDay } from '../challenges';

vi.mock('../firestore', () => ({ updateUserStatsAfterSession: vi.fn(async () => {}) }));

const DAY = 86_400_000;
let challengeUpdate: Record<string, unknown> | undefined;

const setup = (historyLength: number, startedDaysAgo: number) => {
  const history = Array.from({ length: historyLength }, (_, i) => ({ date: `d${i}`, amount: 10, completed: true }));
  const start = new Date(Date.now() - startedDaysAgo * DAY);
  vi.mocked(runTransaction).mockImplementation(async (_db, fn) => fn({
    get: vi.fn(async (ref: { path?: string }) => (ref?.path?.startsWith('users')
      ? { exists: () => true, data: () => ({ weight: 70 }) }
      : { exists: () => true, data: () => ({
          challengeId: 'pushups_beginner', startDate: { toDate: () => new Date(start) }, history,
          definitionSnapshot: { id: 'x', exerciseId: 'pushups', durationDays: 21, baseAmount: 10, increment: 1 },
        }) })),
    set: vi.fn(),
    update: vi.fn((ref: { path?: string }, data: Record<string, unknown>) => { if (!ref?.path?.startsWith('users')) challengeUpdate = data; }),
  } as never) as never);
};

describe('validateChallengeDay', () => {
  beforeEach(() => { challengeUpdate = undefined; vi.spyOn(Timestamp, 'now').mockReturnValue({ toDate: () => new Date() } as never); });

  it('does not close a challenge whose steps are not all done (catch-up model)', async () => {
    setup(10, 25); // 21-day challenge, day 26 on the calendar, only 10 steps validated
    await validateChallengeDay('c1', 'u1', 20);
    expect(challengeUpdate?.status).toBe('active'); // 11/21: catching up must stay possible
  });

  it('closes it once the last step is validated', async () => {
    setup(20, 25);
    await validateChallengeDay('c1', 'u1', 30);
    expect(challengeUpdate?.status).toBe('completed');
  });

  it('logs the local calendar date (not the UTC one, a day off just after midnight)', async () => {
    const previous = process.env.TZ;
    process.env.TZ = 'Europe/Paris'; // 00:30 in Paris is 22:30 UTC the day before
    try {
      setup(0, 0);
      await validateChallengeDay('c1', 'u1', 10, new Date(2026, 9, 4, 0, 30));
      const history = challengeUpdate?.history as { date: string }[];
      expect(history[history.length - 1]!.date).toBe('2026-10-04');
    } finally {
      process.env.TZ = previous;
    }
  });
});
