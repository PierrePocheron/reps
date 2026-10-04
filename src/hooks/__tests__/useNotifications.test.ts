import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const ln = vi.hoisted(() => ({
  checkPermissions: vi.fn(async () => ({ display: 'granted' })),
  requestPermissions: vi.fn(async () => ({ display: 'granted' })),
  getPending: vi.fn(async () => ({ notifications: [] })),
  cancel: vi.fn(async () => {}),
  schedule: vi.fn(async (_options: unknown) => ({})),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' }, registerPlugin: vi.fn(() => ({})) }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: ln }));
vi.mock('@/firebase/fcm', () => ({ requestFCMToken: vi.fn(), saveFCMToken: vi.fn(), disableFCMNotifications: vi.fn(), onForegroundMessage: vi.fn(() => () => {}) }));

import { useNotifications } from '../useNotifications';

describe('daily reminder (native)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('repeats every day at the chosen time: `on` (rescheduled after each delivery), not `at` + `every` (fires once)', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => { await result.current.scheduleDailyReminder('07:30'); });
    const { schedule } = (ln.schedule.mock.calls[0]![0] as { notifications: { schedule: Record<string, unknown> }[] }).notifications[0]!;
    expect(schedule).toEqual({ on: { hour: 7, minute: 30 }, allowWhileIdle: true });
  });
});
