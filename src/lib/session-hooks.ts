/**
 * Features register cleanup that must run when the session ends (guide §2.1): unsent report drafts
 * belong to the person who signed out, and plant devices are shared. The auth feature calls these
 * without importing the features that own the data.
 */
const cleanups = new Set<() => void>();

export function registerSignOutCleanup(fn: () => void): () => void {
  cleanups.add(fn);
  return () => cleanups.delete(fn);
}

export function runSignOutCleanups(): void {
  for (const fn of cleanups) fn();
}
