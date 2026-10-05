import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runTransaction, Timestamp } from 'firebase/firestore';
import { validateChallengeDay } from '../challenges';

vi.mock('../firestore', () => ({ updateUserStatsAfterSession: vi.fn(async () => {}) }));

const DAY = 86_400_000;
let challengeUpdate: Record<string, unknown> | undefined;

let sessionWritten: Record<string, unknown> | undefined;
const setup = (historyLength: number, startedDaysAgo: number, exerciseId = 'pushups', status = 'active') => {
  const history = Array.from({ length: historyLength }, (_, i) => ({ date: `d${i}`, amount: 10, completed: true }));
  const start = new Date(Date.now() - startedDaysAgo * DAY);
  vi.mocked(runTransaction).mockImplementation(async (_db, fn) => fn({
    get: vi.fn(async (ref: { path?: string }) => (ref?.path?.startsWith('users')
      ? { exists: () => true, data: () => ({ weight: 70 }) }
      : { exists: () => true, data: () => ({
          challengeId: 'pushups_beginner', status, startDate: { toDate: () => new Date(start) }, history,
          definitionSnapshot: { id: 'x', exerciseId, durationDays: 21, baseAmount: 10, increment: 1 },
        }) })),
    set: vi.fn((_ref: unknown, data: Record<string, unknown>) => { sessionWritten = data; }),
    update: vi.fn((ref: { path?: string }, data: Record<string, unknown>) => { if (!ref?.path?.startsWith('users')) challengeUpdate = data; }),
  } as never) as never);
};

describe('validateChallengeDay', () => {
  beforeEach(() => { challengeUpdate = undefined; sessionWritten = undefined; vi.spyOn(Timestamp, 'now').mockReturnValue({ toDate: () => new Date() } as never); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('does not close a challenge whose steps are not all done (catch-up model)', async () => {
    setup(10, 25); // 21-day challenge, day 26 on the calendar, only 10 steps validated
    await validateChallengeDay('c1', 'u1');
    expect(challengeUpdate?.status).toBe('active'); // 11/21: catching up must stay possible
  });

  it('closes it once the last step is validated', async () => {
    setup(20, 25);
    await validateChallengeDay('c1', 'u1');
    expect(challengeUpdate?.status).toBe('completed');
  });

  it('logs the local calendar date (not the UTC one, a day off just after midnight)', async () => {
    const previous = process.env.TZ;
    process.env.TZ = 'Europe/Paris'; // 00:30 in Paris is 22:30 UTC the day before
    try {
      setup(0, 0);
      await validateChallengeDay('c1', 'u1', new Date(2026, 9, 4, 0, 30));
      const history = challengeUpdate?.history as { date: string }[];
      expect(history[history.length - 1]!.date).toBe('2026-10-04');
    } finally {
      process.env.TZ = previous;
    }
  });

  it("« Épaules 3D » se valide : l'exercice des défis déjà rejoints a été déplacé en musculation", async () => {
    setup(0, 0, 'lateral_raises');
    await expect(validateChallengeDay('c1', 'u1')).resolves.not.toThrow(); // threw « Exercise definition not found »
    expect((sessionWritten?.exercises as { name: string }[])[0]!.name).toBe('Élévation latérale');
  });

  it('logs the target of the step it validates, not the one a stale card still shows', async () => {
    setup(1, 2); // 2 days late: J1 is stored, the card has not refreshed yet and still offers J1 (quick second tap)
    await expect(validateChallengeDay('c1', 'u1')).resolves.toMatchObject({ step: 1, reps: 11 });
    expect((challengeUpdate?.history as { amount: number }[])[1]!.amount).toBe(11); // J2 = 10 + 1, not J1's 10
    expect(sessionWritten?.totalReps).toBe(11);
  });

  it.each([['completed', 20], ['active', 21]])('refuses to validate when status is %s with %i/21 steps (no extra step or session)', async (status, steps) => {
    setup(steps, 30, 'pushups', status);
    await expect(validateChallengeDay('c1', 'u1')).rejects.toThrow(/terminé/);
    expect(challengeUpdate).toBeUndefined();
    expect(sessionWritten).toBeUndefined();
  });

  it('fails at once with a clear message offline (a transaction needs the network)', async () => {
    setup(0, 0);
    vi.mocked(runTransaction).mockClear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await expect(validateChallengeDay('c1', 'u1')).rejects.toThrow(/hors ligne/);
    expect(runTransaction).not.toHaveBeenCalled(); // no 6-second spinner before the error
  });

  it('gives the same message when the server cannot be reached', async () => {
    vi.mocked(runTransaction).mockRejectedValueOnce(Object.assign(new Error('client is offline'), { code: 'unavailable' }));
    await expect(validateChallengeDay('c1', 'u1')).rejects.toThrow(/hors ligne/);
  });

  it.each([[0, 3, true], [3, 3, false]])('flags the step as catch-up when it is behind the calendar (%i steps done, started %i days ago)', async (steps, daysAgo, catchUp) => {
    setup(steps, daysAgo);
    await validateChallengeDay('c1', 'u1');
    expect((challengeUpdate?.history as { catchUp: boolean }[])[steps]!.catchUp).toBe(catchUp);
  });
});
