/**
 * Connects the HTTP client to the session without importing UI code.
 *
 * A 401 on an authenticated call first tries to refresh the token once (the server accepts a token
 * up to 7 days past expiry, so a phone that was offline can still send what it saved). Only when
 * that fails is the person signed out, exactly once, however many calls fail together.
 */
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;
/** Returns the new token, or null when the session cannot be refreshed. Throws on network errors. */
let refreshHandler: ((stale: string) => Promise<string | null>) | null = null;
let inflight: Promise<string | null> | null = null;

export const authBridge = {
  setToken(next: string | null): void {
    token = next;
  },
  getToken(): string | null {
    return token;
  },
  setUnauthorizedHandler(handler: (() => void) | null): void {
    onUnauthorized = handler;
  },
  setRefreshHandler(handler: ((stale: string) => Promise<string | null>) | null): void {
    refreshHandler = handler;
  },
  /**
   * Single flight: calls that fail together share one refresh. If another call already replaced
   * `stale`, its result is reused without asking the server again.
   */
  async refresh(stale: string): Promise<string | null> {
    if (token !== null && token !== stale) return token;
    if (!refreshHandler) return null;
    if (!inflight) {
      const handler = refreshHandler;
      inflight = handler(stale).finally(() => {
        inflight = null;
      });
    }
    return inflight;
  },
  notifyUnauthorized(): void {
    if (token === null) return; // already signed out: later 401s are ignored
    token = null;
    onUnauthorized?.();
  },
};
