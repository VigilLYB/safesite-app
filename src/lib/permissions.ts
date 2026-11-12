import type { Action, IncidentSummary, Role, User } from "@/lib/api";

export const roleLabel: Record<Role, string> = {
  WORKER: "Worker",
  SUPERVISOR: "Supervisor",
  MANAGER: "Safety manager",
};

export const isStaff = (role: Role | null | undefined): boolean =>
  role === "SUPERVISOR" || role === "MANAGER";

/**
 * The few rules the server does not hand us as flags (guide §4.7): an action can be progressed
 * while it is OPEN or IN_PROGRESS, by staff or by its assignee. The server enforces it again.
 */
export function canProgressAction(
  user: Pick<User, "id" | "role"> | null,
  action: Pick<Action, "status" | "assignee">,
): boolean {
  if (!user) return false;
  if (action.status !== "OPEN" && action.status !== "IN_PROGRESS") return false;
  return isStaff(user.role) || action.assignee?.id === user.id;
}

/** Retry transcription has no permission flag: limit it to the reporter and staff. */
export function canRetryTranscription(
  user: Pick<User, "id" | "role"> | null,
  incident: {
    processing: { transcription: string };
    audio: unknown;
    reporter: { id: string };
  },
): boolean {
  if (!user) return false;
  if (incident.processing.transcription !== "FAILED" || !incident.audio) return false;
  return isStaff(user.role) || incident.reporter.id === user.id;
}

/** A worker may open only duplicate rows they reported; staff may open any. */
export function canOpenDuplicateRow(
  user: Pick<User, "id" | "role"> | null,
  row: Pick<IncidentSummary, "reporter">,
): boolean {
  if (!user) return false;
  return isStaff(user.role) || row.reporter.id === user.id;
}

/** Unlink is staff-only. */
export const canUnlinkDuplicate = (role: Role | null | undefined): boolean => isStaff(role);

/** Next incomplete milestone: the lowest `seq` without `completedAt`. */
export function nextMilestoneId(action: Pick<Action, "milestones">): string | null {
  const open = (action.milestones ?? [])
    .filter((milestone) => !milestone.completedAt)
    .sort((a, b) => a.seq - b.seq)[0];
  return open?.id ?? null;
}
