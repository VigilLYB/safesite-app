import { randomUUID } from "expo-crypto";

/** A fresh UUID. Create idempotency keys once per user action, never once per attempt. */
export function newId(): string {
  return randomUUID();
}
