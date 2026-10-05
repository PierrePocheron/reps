import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from '../settingsStore';

describe('reminder time', () => {
  beforeEach(() => { localStorage.clear(); useSettingsStore.setState({ notificationTime: '18:00' }); });

  it('a cleared time field is ignored (it scheduled the reminder at midnight)', () => {
    useSettingsStore.getState().setNotificationTime('');
    expect(useSettingsStore.getState().notificationTime).toBe('18:00');
  });

  it("a device that already saved an empty time gets the default back", () => {
    localStorage.setItem('reps_settings', JSON.stringify({ notificationsEnabled: true, notificationTime: '' }));
    useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().notificationTime).toBe('18:00');
  });
});
