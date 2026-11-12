import { isKnownAppPath } from "./routes";

/**
 * Validate the `next` parameter after login (guide §2.1). `startsWith("/")` alone is an open
 * redirect (`//evil.example`, `/\evil.example`), so only same-app paths are accepted.
 */
export function safeNext(next: string | string[] | null | undefined, fallback: string): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return fallback;
  return isKnownAppPath(value) ? value : fallback;
}
