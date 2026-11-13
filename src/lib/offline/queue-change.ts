import type { QueryClient } from "@tanstack/react-query";
import {
  actionKeys,
  incidentKeys,
  isApiError,
  type Action,
  type EditIncidentInput,
  type Incident,
  type TransitionEvent,
} from "@/lib/api";
import { clock } from "@/lib/clock";
import { outbox, type Outbox } from "./outbox";

/**
 * Queues a change made without a connection and shows it on screen straight away. The outbox
 * sends it later (features/sync); the server's answer then replaces this local copy.
 */

/** The request never got an answer because of the connection (not because the server said no). */
export const isOfflineError = (error: unknown): boolean =>
  isApiError(error) && (error.kind === "network" || error.kind === "timeout");

/** A timeout may have reached the server; a refused connection did not. */
export const mayHaveBeenSent = (error: unknown): boolean =>
  isApiError(error) && error.kind === "timeout";

const queuedResults = new WeakSet<object>();
/** True for the stand-in a queued change returns: callers skip refetches that would undo it. */
export const isQueuedResult = (value: unknown): boolean =>
  typeof value === "object" && value !== null && queuedResults.has(value);

const titleOf = (incident: Pick<Incident, "title">) => incident.title?.trim() || "Untitled report";

const PAST: Record<TransitionEvent, string> = {
  validate: "Validated",
  approve: "Approved",
  reject: "Rejected",
  reopen: "Reopened",
  close: "Closed",
};

const EDITABLE = ["title", "description", "category", "severity", "customFields"] as const;

/** A report edit, applied locally on top of `incident` (one version ahead, as the server will). */
export async function queueIncidentEdit(
  queryClient: QueryClient,
  incident: Incident,
  patch: Omit<EditIncidentInput, "expectedVersion" | "photoKey">,
  options: { maybeSent?: boolean; box?: Outbox } = {},
): Promise<void> {
  const box = options.box ?? outbox;
  await box.add({
    label: `Edited "${titleOf(incident)}"`,
    change: {
      kind: "incident.edit",
      incidentId: incident.id,
      body: { ...patch, expectedVersion: incident.version },
    },
    ...(options.maybeSent ? { maybeSent: true } : {}),
  });
  const next: Incident = { ...incident, version: incident.version + 1 };
  for (const field of EDITABLE) {
    const value = patch[field];
    if (value !== undefined) (next as Record<string, unknown>)[field] = value;
  }
  queryClient.setQueryData(incidentKeys.detail(incident.id), next);
}

/** A status change. Its result is the server's to decide, so only the version moves locally. */
export async function queueTransition(
  queryClient: QueryClient,
  incident: Incident,
  event: TransitionEvent,
  note: string | undefined,
  options: { maybeSent?: boolean; box?: Outbox } = {},
): Promise<void> {
  const box = options.box ?? outbox;
  await box.add({
    label: `${PAST[event]} "${titleOf(incident)}"`,
    change: {
      kind: "incident.transition",
      incidentId: incident.id,
      event,
      expectedVersion: incident.version,
      ...(note ? { note } : {}),
    },
    ...(options.maybeSent ? { maybeSent: true } : {}),
  });
  queryClient.setQueryData(incidentKeys.detail(incident.id), {
    ...incident,
    version: incident.version + 1,
    // No more status buttons until the server has answered.
    permissions: { ...incident.permissions, transitions: [] },
  });
}

function cachedAction(queryClient: QueryClient, actionId: string): Action | undefined {
  return queryClient.getQueryData<Action>(actionKeys.detail(actionId));
}

function statusAfter(milestones: NonNullable<Action["milestones"]>): Action["status"] {
  const done = milestones.filter((m) => m.completedAt !== null).length;
  if (done === 0) return "OPEN";
  return done === milestones.length ? "DONE" : "IN_PROGRESS";
}

/** Returns the locally updated action, or null when it is not on the device (nothing to show). */
export async function queueMilestone(
  queryClient: QueryClient,
  actionId: string,
  milestoneId: string,
  options: { maybeSent?: boolean; box?: Outbox } = {},
): Promise<Action | null> {
  const action = cachedAction(queryClient, actionId);
  const milestone = action?.milestones?.find((m) => m.id === milestoneId);
  if (!action?.milestones || !milestone) return null;
  const box = options.box ?? outbox;
  await box.add({
    label: `Completed "${milestone.title}" (${action.title})`,
    change: { kind: "action.milestone", actionId, milestoneId, incidentId: action.incident.id },
    ...(options.maybeSent ? { maybeSent: true } : {}),
  });
  const now = new Date(clock.nowMs()).toISOString();
  const milestones = action.milestones.map((m) =>
    m.id === milestoneId ? { ...m, completedAt: now, isOverdue: false } : m,
  );
  const status = statusAfter(milestones);
  const next: Action = {
    ...action,
    milestones,
    status,
    completedAt: status === "DONE" ? now : action.completedAt,
    progress: { done: milestones.filter((m) => m.completedAt).length, total: milestones.length },
  };
  queryClient.setQueryData(actionKeys.detail(actionId), next);
  queuedResults.add(next);
  return next;
}

export async function queueActionComplete(
  queryClient: QueryClient,
  actionId: string,
  options: { maybeSent?: boolean; box?: Outbox } = {},
): Promise<Action | null> {
  const action = cachedAction(queryClient, actionId);
  if (!action) return null;
  const box = options.box ?? outbox;
  await box.add({
    label: `Completed "${action.title}"`,
    change: { kind: "action.complete", actionId, incidentId: action.incident.id },
    ...(options.maybeSent ? { maybeSent: true } : {}),
  });
  const now = new Date(clock.nowMs()).toISOString();
  const next: Action = { ...action, status: "DONE", completedAt: now, isOverdue: false };
  queryClient.setQueryData(actionKeys.detail(actionId), next);
  queuedResults.add(next);
  return next;
}
