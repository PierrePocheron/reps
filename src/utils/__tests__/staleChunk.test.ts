import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reloadOnStaleChunk } from '../staleChunk';

const event = () => new Event('vite:preloadError', { cancelable: true });

describe('reloadOnStaleChunk', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });

  it('reloads once to fetch the new build and swallows the error', () => {
    const reload = vi.fn();
    const e = event();
    reloadOnStaleChunk(e, reload);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it('does not loop when the new build fails too', () => {
    const reload = vi.fn();
    reloadOnStaleChunk(event(), reload);
    const second = event();
    reloadOnStaleChunk(second, reload);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(false); // error boundary takes over
  });

  it('does nothing offline (a reload would not help)', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const reload = vi.fn();
    reloadOnStaleChunk(event(), reload);
    expect(reload).not.toHaveBeenCalled();
  });
});
