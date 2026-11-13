import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { z } from "zod";
import { userSchema } from "@/lib/api";

const KEY = "safesite.session";

const sessionSchema = z.object({
  accessToken: z.string().min(1),
  expiresAt: z.string(),
  user: userSchema,
});
export type Session = z.infer<typeof sessionSchema>;

/**
 * The token lives in the OS keychain / keystore, never in plain storage. SecureStore does not
 * exist on web, and the guide forbids localStorage/sessionStorage for tokens: on web the session
 * is held in memory only, so a page reload signs the person out.
 */
let webSession: string | null = null;
const isWeb = () => Platform.OS === "web";

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = isWeb() ? webSession : await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // unreadable storage means "signed out", not a crash
  }
}

export async function saveSession(session: Session): Promise<void> {
  if (isWeb()) {
    webSession = JSON.stringify(session);
    return;
  }
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  webSession = null;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing to clear; the in-memory session is already gone.
  }
}

/**
 * How long after its token expires a saved session can still be resumed. Mirrors the server's
 * JWT_REFRESH_GRACE_SECONDS: inside it the app opens (offline too) and refreshes the token once
 * it is online. Past it, the person must sign in again.
 */
export const REFRESH_GRACE_MS = 7 * 24 * 60 * 60_000;

export function isPastGrace(session: Session, nowMs: number): boolean {
  const expiresAt = new Date(session.expiresAt).getTime();
  return Number.isNaN(expiresAt) || expiresAt + REFRESH_GRACE_MS <= nowMs;
}

export function isExpired(session: Session, nowMs: number): boolean {
  const expiresAt = new Date(session.expiresAt).getTime();
  return Number.isNaN(expiresAt) || expiresAt <= nowMs;
}
