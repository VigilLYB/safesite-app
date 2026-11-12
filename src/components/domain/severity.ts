import type { Severity } from "@/lib/api";

export const SEVERITIES: readonly Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const severityLabel: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

/** Signal-bar count: 1 to 4. Severity is never colour alone: shape + label + pips. */
export const severityPips: Record<Severity, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

export const severityHint: Record<Severity, string> = {
  LOW: "Housekeeping, no injury risk",
  MEDIUM: "Could cause a minor injury",
  HIGH: "Could cause a serious injury or a release",
  CRITICAL: "Immediate danger. Also call the control room.",
};
