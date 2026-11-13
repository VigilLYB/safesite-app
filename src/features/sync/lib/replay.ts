import {
  isApiError,
  isStaleVersion,
  userMessage,
  type Action,
  type EditIncidentInput,
  type Incident,
  type TransitionEvent,
} from "@/lib/api";
import {
  baseVersion,
  type Outbox,
  type OutboxChange,
  type OutboxEntry,
} from "@/lib/offline/outbox";

export interface ReplayDeps {
  edit: (id: string, body: EditIncidentInput) => Promise<Incident>;
  transition: (
    id: string,
    body: { event: TransitionEvent; expectedVersion: number; note?: string | undefined },
  ) => Promise<Incident>;
  getIncident: (id: string) => Promise<Incident>;
  completeMilestone: (actionId: string, milestoneId: string) => Promise<Action>;
  completeAction: (actionId: string) => Promise<Action>;
}

/** No connection, a server outage, throttling or a sign-in problem: stop and try again later. */
function isTransient(error: unknown): boolean {
  if (!isApiError(error)) return true;
  return (
    error.kind === "network" ||
    error.kind === "timeout" ||
    error.kind === "server" ||
    error.kind === "unauthorized" ||
    error.status === 429
  );
}

async function apply(change: OutboxChange, deps: ReplayDeps): Promise<void> {
  switch (change.kind) {
    case "incident.edit":
      await deps.edit(change.incidentId, change.body);
      return;
    case "incident.transition":
      await deps.transition(change.incidentId, {
        event: change.event,
        expectedVersion: change.expectedVersion,
        ...(change.note ? { note: change.note } : {}),
      });
      return;
    case "action.milestone":
      await deps.completeMilestone(change.actionId, change.milestoneId);
      return;
    case "action.complete":
      await deps.completeAction(change.actionId);
  }
}

/** Key order must not matter when comparing custom fields. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * After a 409 on an edit: does the report already say what this edit says? Then an earlier send
 * landed (its answer was lost) and there is nothing left to do.
 */
async function editAlreadyApplied(
  change: Extract<OutboxChange, { kind: "incident.edit" }>,
  deps: ReplayDeps,
): Promise<boolean> {
  try {
    const current = (await deps.getIncident(change.incidentId)) as unknown as Record<
      string,
      unknown
    >;
    return Object.entries(change.body).every(
      ([field, value]) =>
        field === "expectedVersion" ||
        field === "note" ||
        value === undefined ||
        stable(current[field]) === stable(value),
    );
  } catch {
    return false;
  }
}

/**
 * Sends the person's queued changes in the order they were made.
 * - Sent: removed from the outbox.
 * - 409 STALE_VERSION: someone else changed the report first. Marked `conflict` for the person
 *   to decide (send theirs anyway, or discard). Never resent silently.
 * - Any other refusal (403, 404, 422): marked `failed` with the server's reason.
 * - A connection or server problem: stop, keep everything, try on the next sync.
 * Later changes to a report with an unresolved change wait behind it: they were based on it.
 */
export async function replayOutbox(
  box: Outbox,
  deps: ReplayDeps,
): Promise<{ sent: OutboxEntry[]; stopped: boolean }> {
  const sent: OutboxEntry[] = [];
  const blocked = new Set<string>();
  for (const entry of [...box.entries()]) {
    const versioned = baseVersion(entry.change) !== null;
    const incidentId = entry.change.incidentId;
    if (entry.status !== "pending") {
      if (versioned) blocked.add(incidentId);
      continue;
    }
    if (versioned && blocked.has(incidentId)) continue;
    try {
      await apply(entry.change, deps);
      await box.remove(entry.id);
      sent.push(entry);
    } catch (error) {
      if (isTransient(error)) return { sent, stopped: true };
      if (isStaleVersion(error)) {
        if (
          entry.change.kind === "incident.edit" &&
          (await editAlreadyApplied(entry.change, deps))
        ) {
          await box.remove(entry.id);
          sent.push(entry);
          continue;
        }
        await box.mark(
          entry.id,
          "conflict",
          entry.maybeSent
            ? "This change may already have been sent. Open the report to check."
            : "Someone else changed this report before your change was sent.",
        );
        blocked.add(incidentId);
        continue;
      }
      await box.mark(entry.id, "failed", userMessage(error));
      if (versioned) blocked.add(incidentId);
    }
  }
  return { sent, stopped: false };
}
