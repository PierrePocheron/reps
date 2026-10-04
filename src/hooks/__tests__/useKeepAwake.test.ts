import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeepAwake } from '../useKeepAwake';
import { useSettingsStore } from '@/store/settingsStore';

const release = vi.fn().mockResolvedValue(undefined);
const request = vi.fn().mockResolvedValue({ release });
Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });

describe('useKeepAwake (web)', () => {
  beforeEach(() => { vi.clearAllMocks(); useSettingsStore.setState({ keepAwake: true }); });

  it('garde l\'écran allumé pendant la séance et le relâche à la fin', async () => {
    const { rerender } = renderHook(({ on }) => useKeepAwake(on), { initialProps: { on: true } });
    expect(request).toHaveBeenCalledWith('screen');
    await Promise.resolve();
    rerender({ on: false });
    expect(release).toHaveBeenCalled();
  });

  it('ne fait rien hors séance ou si le réglage est désactivé', () => {
    renderHook(() => useKeepAwake(false));
    useSettingsStore.setState({ keepAwake: false });
    renderHook(() => useKeepAwake(true));
    expect(request).not.toHaveBeenCalled();
  });
});
