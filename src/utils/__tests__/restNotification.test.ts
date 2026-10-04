import { describe, it, expect, vi, beforeEach } from 'vitest';

const native = vi.hoisted(() => ({ on: true }));
const ln = vi.hoisted(() => ({
  checkPermissions: vi.fn(async () => ({ display: 'granted' })),
  requestPermissions: vi.fn(async () => ({ display: 'granted' })),
  schedule: vi.fn(async (_options: unknown) => ({})),
  cancel: vi.fn(async () => {}),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.on, getPlatform: () => 'android' } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }));

import { scheduleRestEnd, cancelRestEnd } from '../restNotification';

describe('rest end notification', () => {
  beforeEach(() => { vi.clearAllMocks(); native.on = true; });

  it('does nothing on the web (no lock-screen notification there)', async () => {
    native.on = false;
    await scheduleRestEnd(Date.now() + 90_000);
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('schedules it for the end of the rest', async () => {
    const at = Date.now() + 90_000;
    await scheduleRestEnd(at);
    expect(ln.schedule).toHaveBeenCalledTimes(1);
    expect(ln.schedule.mock.calls[0]![0]).toMatchObject({ notifications: [{ schedule: { at: new Date(at) } }] });
  });

  it('schedules nothing if the rest was stopped while the permission prompt was open', async () => {
    let answer!: (v: { display: string }) => void;
    ln.checkPermissions.mockResolvedValueOnce({ display: 'prompt' });
    ln.requestPermissions.mockReturnValueOnce(new Promise((r) => { answer = r; }));
    const pending = scheduleRestEnd(Date.now() + 90_000);
    await Promise.resolve();
    cancelRestEnd(); // rest dismissed during the prompt
    answer({ display: 'granted' });
    await pending;
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('a newer rest (±15 s) wins over the one still waiting for permission', async () => {
    let answer!: (v: { display: string }) => void;
    ln.checkPermissions.mockResolvedValueOnce({ display: 'prompt' });
    ln.requestPermissions.mockReturnValueOnce(new Promise((r) => { answer = r; }));
    const first = scheduleRestEnd(1_000_000);
    await Promise.resolve();
    const second = scheduleRestEnd(1_015_000);
    answer({ display: 'granted' });
    await Promise.all([first, second]);
    expect(ln.schedule).toHaveBeenCalledTimes(1);
    expect(ln.schedule.mock.calls[0]![0]).toMatchObject({ notifications: [{ schedule: { at: new Date(1_015_000) } }] });
  });
});
