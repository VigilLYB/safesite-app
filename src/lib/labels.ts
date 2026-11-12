import type { ActionStatus, ActionType, IncidentStatus, Role } from "@/lib/api";

/** Label tables from guide §2.7. Labels the API supplies (timeline `label`) are never rebuilt here. */
export const statusMeaning: Record<IncidentStatus, string> = {
  OPEN: "Waiting for a supervisor",
  VALIDATED: "Checked by a supervisor, waiting for approval",
  APPROVED: "Needs a corrective action",
  ACTION_ASSIGNED: "Corrective action in progress",
  RESOLVED: "Action done, waiting for a manager to close",
  CLOSED: "Finished",
  REJECTED: "Dismissed, with a recorded reason",
};

export const STATUS_ORDER: readonly IncidentStatus[] = [
  "OPEN",
  "VALIDATED",
  "APPROVED",
  "ACTION_ASSIGNED",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

export const locationSourceLabel = {
  GPS_ESTIMATE: "Estimated from GPS (drag to correct)",
  MANUAL: "Placed by hand",
  NONE: "No location yet",
} as const;

export const languageLabel: Record<string, string> = {
  "en-IN": "English (India)",
  "hi-IN": "Hindi",
};

export const actionTypeLabel: Record<ActionType, string> = {
  ONE_OFF: "One-off fix",
  PREBUILT: "Prebuilt action",
  CUSTOM: "Custom action",
};

export const actionStatusLabel: Record<ActionStatus, string> = {
  OPEN: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const ppeVerdictLabel = {
  COMPLIANT: "PPE compliant",
  VIOLATION: "PPE missing",
  NO_PERSONS: "No people detected",
} as const;

export const ppeEquipmentLabel: Record<string, string> = {
  HEAD_COVER: "Head cover (helmet)",
  HAND_COVER: "Gloves",
  FACE_COVER: "Face cover",
};

export const shiftLabel = {
  A: "Morning 06:00–14:00",
  B: "Afternoon 14:00–22:00",
  C: "Night 22:00–06:00",
} as const;

export const actorRoleLabel: Record<Role | "SYSTEM", string> = {
  WORKER: "Worker",
  SUPERVISOR: "Supervisor",
  MANAGER: "Safety manager",
  SYSTEM: "SafeSite AI",
};

/** Heatmap weights (guide §2.7). */
export const severityWeight = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 5 } as const;

const CHANGED_FIELD_GROUPS: Record<string, string> = {
  status: "Status",
  title: "Title",
  description: "Description",
  transcript: "Transcript",
  transcriptLanguage: "Transcript",
  category: "Category",
  severity: "Severity",
  blueprintId: "Location",
  pinX: "Location",
  pinY: "Location",
  locationSource: "Location",
  areaId: "Location",
  gpsLat: "GPS fix",
  gpsLng: "GPS fix",
  gpsAccuracyM: "GPS fix",
  photoKey: "Photo",
  audioKey: "Voice note",
  customFields: "Extra details",
  clusterParentId: "Duplicate link",
  clusterSimilarity: "Duplicate link",
};

/** Raw changed fields -> user-facing groups, each shown once, in first-seen order. */
export function changedFieldGroups(fields: readonly string[]): string[] {
  const out: string[] = [];
  for (const field of fields) {
    const group = CHANGED_FIELD_GROUPS[field];
    if (group && !out.includes(group)) out.push(group);
  }
  return out;
}

/** Which groups a node changed, as a lookup for highlighting a snapshot field. */
export const groupOfField = (field: string): string | undefined => CHANGED_FIELD_GROUPS[field];
