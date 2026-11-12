import { getRandomBytes } from "expo-crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A temporary password from secure random bytes (no look-alike characters). 10–200 chars. */
export function generatePassword(length = 16): string {
  const bytes = getRandomBytes(length);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

export type TeamTab = "all" | "WORKER" | "SUPERVISOR" | "MANAGER";

/** Tabs and the search box filter on the client: the list is small and unpaginated. */
export function filterUsers<T extends { fullName: string; email: string; role: string }>(
  users: readonly T[],
  tab: TeamTab,
  search: string,
): T[] {
  const needle = search.trim().toLowerCase();
  return users.filter(
    (user) =>
      (tab === "all" || user.role === tab) &&
      (needle === "" ||
        user.fullName.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle)),
  );
}
