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

/** The token lives in the OS keychain / keystore, never in plain storage. */
export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    if (!raw) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null; // unreadable storage means "signed out", not a crash
  }
}

export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nothing to clear; the in-memory session is already gone.
  }
}

export function isExpired(session: Session, nowMs: number): boolean {
  const expiresAt = new Date(session.expiresAt).getTime();
  return Number.isNaN(expiresAt) || expiresAt <= nowMs;
}
