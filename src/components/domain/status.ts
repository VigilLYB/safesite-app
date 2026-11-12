import type { IncidentStatus } from "@/lib/api";

export const statusLabel: Record<IncidentStatus, string> = {
  OPEN: "Open",
  VALIDATED: "Validated",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ACTION_ASSIGNED: "Action assigned",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const NEEDS_REVIEW = "OPEN,VALIDATED";
export const IN_PROGRESS = "APPROVED,ACTION_ASSIGNED";
export const FINISHED = "RESOLVED,CLOSED,REJECTED";
