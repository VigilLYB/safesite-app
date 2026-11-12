/**
 * Connects the HTTP client to the session without importing UI code.
 * A 401 on an authenticated call signs the user out exactly once, however many calls fail together.
 */
let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

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
  notifyUnauthorized(): void {
    if (token === null) return; // already signed out: later 401s are ignored
    token = null;
    onUnauthorized?.();
  },
};
