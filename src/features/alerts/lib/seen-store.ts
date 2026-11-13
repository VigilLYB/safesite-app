import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { registerSignOutCleanup } from "@/lib/session-hooks";

/**
 * Which alerts a person has already looked at. Held in memory and mirrored to the keychain per
 * user, so the badge survives a restart. (Web keeps it in memory only, like the session.)
 */
const seenByUser = new Map<string, ReadonlySet<string>>();
const loading = new Set<string>();
const listeners = new Set<() => void>();
const EMPTY: ReadonlySet<string> = new Set();
const emit = () => listeners.forEach((listener) => listener());
const keyFor = (userId: string) => `safesite.alerts.seen.${userId}`;

export function getSeen(userId: string): ReadonlySet<string> {
  return seenByUser.get(userId) ?? EMPTY;
}

export function setSeen(userId: string, seen: ReadonlySet<string>): void {
  seenByUser.set(userId, seen);
  emit();
  if (Platform.OS === "web") return;
  void SecureStore.setItemAsync(keyFor(userId), JSON.stringify([...seen])).catch(() => undefined);
}

/** Load the persisted set once per user per app run. */
export async function loadSeen(userId: string): Promise<void> {
  if (seenByUser.has(userId) || loading.has(userId)) return;
  loading.add(userId);
  try {
    const raw = Platform.OS === "web" ? null : await SecureStore.getItemAsync(keyFor(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const ids = Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
    seenByUser.set(userId, new Set(ids));
  } catch {
    seenByUser.set(userId, new Set());
  } finally {
    loading.delete(userId);
    emit();
  }
}

export const isSeenLoaded = (userId: string): boolean => seenByUser.has(userId);

export function useSeenAlerts(userId: string | undefined): ReadonlySet<string> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (userId ? getSeen(userId) : EMPTY),
    () => EMPTY,
  );
}

// A shared device must not carry one person's read state into the next sign-in's memory.
registerSignOutCleanup(() => {
  seenByUser.clear();
  emit();
});
