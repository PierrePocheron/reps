import { describe, it, expect, vi, beforeEach } from 'vitest';

const native = vi.hoisted(() => ({ on: true }));
const ln = vi.hoisted(() => ({
  checkPermissions: vi.fn(async () => ({ display: 'granted' })),
  getPending: vi.fn(async () => ({ notifications: [] as { id: number }[] })),
  cancel: vi.fn(async () => {}),
  schedule: vi.fn(async (_options: unknown) => ({})),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.on, getPlatform: () => 'android' } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }));

import { restoreDailyReminder } from '../dailyReminder';

const scheduledAt = () => (ln.schedule.mock.calls[0]![0] as { notifications: { schedule: unknown }[] }).notifications[0]!.schedule;

describe('restoreDailyReminder (app start)', () => {
  beforeEach(() => { vi.clearAllMocks(); native.on = true; });

  it('puts back a reminder the switch says is on but the device lost (it used to fire only once)', async () => {
    await restoreDailyReminder(true, '07:30');
    expect(scheduledAt()).toEqual({ on: { hour: 7, minute: 30 }, allowWhileIdle: true });
  });

  it('leaves a pending reminder alone', async () => {
    ln.getPending.mockResolvedValueOnce({ notifications: [{ id: 1 }] });
    await restoreDailyReminder(true, '07:30');
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('does nothing when off, on the web, or without permission', async () => {
    await restoreDailyReminder(false, '07:30');
    native.on = false;
    await restoreDailyReminder(true, '07:30');
    native.on = true;
    ln.checkPermissions.mockResolvedValueOnce({ display: 'denied' });
    await restoreDailyReminder(true, '07:30');
    expect(ln.schedule).not.toHaveBeenCalled();
  });
});
