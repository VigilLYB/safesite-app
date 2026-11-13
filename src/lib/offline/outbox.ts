import type { EditIncidentInput, TransitionEvent } from "@/lib/api";
import { clock } from "@/lib/clock";
import { newId } from "@/lib/id";
import { offlineFiles, type OfflineFiles } from "./files";

/**
 * Changes made while offline, waiting to be sent in the order they were made. One file per
 * person, kept across sign-out so nothing is lost; only that person's next session sends it.
 *
 * Only changes that are safe to replay are queued: report edits and status changes carry the
 * version they were based on (the server answers 409 STALE_VERSION if someone else got there
 * first), and completing a milestone or an action is a no-op on the server when already done.
 */
export type OutboxChange =
  | {
      kind: "incident.edit";
      incidentId: string;
      body: Omit<EditIncidentInput, "photoKey">;
    }
  | {
      kind: "incident.transition";
      incidentId: string;
      event: TransitionEvent;
      expectedVersion: number;
      note?: string | undefined;
    }
  | { kind: "action.milestone"; actionId: string; milestoneId: string; incidentId: string }
  | { kind: "action.complete"; actionId: string; incidentId: string };

export type OutboxStatus = "pending" | "conflict" | "failed";

export interface OutboxEntry {
  id: string;
  userId: string;
  createdAt: number;
  /** What the person did, in their words, e.g. `Edited "Oil on floor"`. */
  label: string;
  change: OutboxChange;
  status: OutboxStatus;
  /** Why it is in `conflict` or `failed`. */
  error: string | null;
  /** The first send was cut off: the server may already have it. */
  maybeSent?: boolean | undefined;
}

/** The incident version this change was based on, for changes that check one. */
export function baseVersion(change: OutboxChange): number | null {
  if (change.kind === "incident.edit") return change.body.expectedVersion;
  if (change.kind === "incident.transition") return change.expectedVersion;
  return null;
}

function withBaseVersion(change: OutboxChange, version: number): OutboxChange {
  if (change.kind === "incident.edit") {
    return { ...change, body: { ...change.body, expectedVersion: version } };
  }
  if (change.kind === "incident.transition") return { ...change, expectedVersion: version };
  return change;
}

const DIR = "outbox";
const fileFor = (userId: string) => [DIR, `${userId}.json`];

type Listener = () => void;

export function createOutbox(files: OfflineFiles = offlineFiles) {
  let userId: string | null = null;
  let entries: OutboxEntry[] = [];
  const listeners = new Set<Listener>();
  let writing: Promise<void> = Promise.resolve();

  const emit = () => listeners.forEach((listener) => listener());

  /** Writes are queued so they land in order; a failed write never blocks the next. */
  const save = () => {
    const owner = userId;
    const snapshot = entries;
    writing = writing
      .catch(() => undefined)
      .then(() => (owner ? files.writeText(fileFor(owner), JSON.stringify(snapshot)) : undefined));
    return writing;
  };

  const set = (next: OutboxEntry[]) => {
    entries = next;
    emit();
    return save();
  };

  return {
    /** Loads the signed-in person's outbox. */
    async load(nextUserId: string): Promise<void> {
      userId = nextUserId;
      let loaded: OutboxEntry[] = [];
      try {
        const raw = await files.readText(fileFor(nextUserId));
        if (raw) loaded = (JSON.parse(raw) as OutboxEntry[]).filter((e) => e.userId === nextUserId);
      } catch {
        loaded = []; // unreadable file: start again rather than crash
      }
      if (userId !== nextUserId) return; // signed out (or switched) while reading
      entries = loaded;
      emit();
    },
    /** Sign-out: forget in memory. The file stays for the person's next sign-in on this device. */
    unload(): void {
      userId = null;
      entries = [];
      emit();
    },
    entries: (): OutboxEntry[] => entries,
    pending: (): OutboxEntry[] => entries.filter((e) => e.status === "pending"),
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async add(input: { label: string; change: OutboxChange; maybeSent?: boolean }) {
      if (!userId) throw new Error("No signed-in user for the outbox");
      const entry: OutboxEntry = {
        id: newId(),
        userId,
        createdAt: clock.nowMs(),
        label: input.label,
        change: input.change,
        status: "pending",
        error: null,
        ...(input.maybeSent ? { maybeSent: true } : {}),
      };
      await set([...entries, entry]);
      return entry;
    },
    async mark(id: string, status: OutboxStatus, error: string | null = null) {
      await set(entries.map((e) => (e.id === id ? { ...e, status, error } : e)));
    },
    async remove(id: string) {
      await set(entries.filter((e) => e.id !== id));
    },
    /**
     * Discards a change. Later queued changes to the same report were based on the version this
     * one would have made, so they are moved back by one.
     */
    async discard(id: string) {
      const index = entries.findIndex((e) => e.id === id);
      const target = entries[index];
      if (!target) return;
      const incidentId = target.change.incidentId;
      const bumps = baseVersion(target.change) !== null;
      await set(
        entries
          .filter((e) => e.id !== id)
          .map((e, i) => {
            const base = baseVersion(e.change);
            if (!bumps || i < index || base === null || e.change.incidentId !== incidentId) {
              return e;
            }
            return { ...e, change: withBaseVersion(e.change, base - 1) };
          }),
      );
    },
    /**
     * "Send mine anyway": base this change, and the queued ones after it for the same report, on
     * the report's current version, then send again.
     */
    async rebase(id: string, currentVersion: number) {
      const index = entries.findIndex((e) => e.id === id);
      const target = entries[index];
      const from = target ? baseVersion(target.change) : null;
      if (!target || from === null) return;
      const delta = currentVersion - from;
      const incidentId = target.change.incidentId;
      await set(
        entries.map((e, i) => {
          const base = baseVersion(e.change);
          if (i < index || base === null || e.change.incidentId !== incidentId) return e;
          const moved = { ...e, change: withBaseVersion(e.change, base + delta) };
          return e.id === id ? { ...moved, status: "pending" as const, error: null } : moved;
        }),
      );
    },
    /** Tests only: wait for queued writes. */
    flushed: () => writing,
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
export const outbox = createOutbox();
