const KEY = 'reps_stale_chunk_reload';

/**
 * After a deploy, a tab still running the previous build asks for lazy chunks that no longer exist (Hosting answers
 * with index.html) and React showed the error page. Reload once to pick up the new build; never loop.
 */
export function reloadOnStaleChunk(event: Event, reload: () => void = () => window.location.reload()): void {
  if (!navigator.onLine) return; // offline: a reload cannot fetch anything, let the error boundary explain
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) ?? 0) < 10_000) return; // just reloaded: give up
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return; // no storage to guard against a reload loop
  }
  event.preventDefault();
  reload();
}
