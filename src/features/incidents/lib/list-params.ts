import type { IncidentFilters, Role, Severity } from "@/lib/api";
import { addDays, plantDayStartIso, YMD } from "@/lib/plant-time";
import { isStaff } from "@/lib/permissions";
import { isUuid } from "@/lib/validation";

/** Status presets per tab (guide §4.3). The server filters: client-side filtering breaks paging. */
export const WORKER_TABS = [
  { value: "active", label: "Active", status: "OPEN,VALIDATED,APPROVED,ACTION_ASSIGNED" },
  { value: "resolved", label: "Resolved", status: "RESOLVED,CLOSED" },
  { value: "rejected", label: "Rejected", status: "REJECTED" },
  { value: "all", label: "All", status: undefined },
] as const;

export const STAFF_TABS = [
  { value: "triage", label: "New Incidents", status: "OPEN" },
  { value: "validated", label: "Validated", status: "VALIDATED" },
  { value: "needs-action", label: "Needs action", status: "APPROVED" },
  { value: "in-progress", label: "In progress", status: "ACTION_ASSIGNED" },
  { value: "closure", label: "Awaiting closure", status: "RESOLVED" },
  { value: "closed", label: "Closed", status: "CLOSED" },
  { value: "rejected", label: "Rejected", status: "REJECTED" },
  { value: "all", label: "All", status: undefined },
] as const;

export type IncidentTab =
  (typeof WORKER_TABS)[number]["value"] | (typeof STAFF_TABS)[number]["value"];

export const tabsFor = (role: Role) => (isStaff(role) ? STAFF_TABS : WORKER_TABS);

export function defaultTab(role: Role): IncidentTab {
  if (role === "WORKER") return "active";
  return role === "MANAGER" ? "closure" : "triage";
}

export interface ListState {
  tab: IncidentTab;
  severity?: Severity | undefined;
  reporterId?: string | undefined;
  blueprintId?: string | undefined;
  areaId?: string | undefined;
  /** Plant-time calendar days, "2026-11-12". */
  fromDay?: string | undefined;
  toDay?: string | undefined;
  /** Explicit choice; undefined means "the tab's default" (New Incidents hides duplicates). */
  rootsOnly?: boolean | undefined;
  mine?: boolean | undefined;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const SEVERITIES: readonly Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Parse URL state and drop anything invalid (guide §4.3). Workers never carry staff-only filters. */
export function parseListParams(raw: Raw, role: Role): ListState {
  const tabs = tabsFor(role);
  const tabValue = first(raw.tab);
  const tab = (tabs.find((t) => t.value === tabValue)?.value ?? defaultTab(role)) as IncidentTab;
  const severity = SEVERITIES.find((s) => s === first(raw.severity));
  const day = (value: string | undefined) =>
    value && YMD.test(value) && !Number.isNaN(Date.parse(value)) ? value : undefined;
  let fromDay = day(first(raw.from));
  let toDay = day(first(raw.to));
  if (fromDay && toDay && fromDay > toDay) {
    fromDay = undefined;
    toDay = undefined;
  }
  const uuid = (value: string | undefined) => (value && isUuid(value) ? value : undefined);
  const bool = (value: string | undefined) =>
    value === "true" ? true : value === "false" ? false : undefined;
  const staff = isStaff(role);
  return {
    tab,
    severity,
    fromDay,
    toDay,
    reporterId: staff ? uuid(first(raw.reporterId)) : undefined,
    blueprintId: staff ? uuid(first(raw.blueprintId)) : undefined,
    areaId: staff ? uuid(first(raw.areaId)) : undefined,
    rootsOnly: staff ? bool(first(raw.rootsOnly)) : undefined,
    mine: staff ? bool(first(raw.mine)) : undefined,
  };
}

/** Back to URL params: only meaningful values, never the cursor. */
export function toUrlParams(state: ListState, role: Role): Record<string, string | undefined> {
  return {
    tab: state.tab === defaultTab(role) ? undefined : state.tab,
    severity: state.severity,
    reporterId: state.reporterId,
    blueprintId: state.blueprintId,
    areaId: state.areaId,
    from: state.fromDay,
    to: state.toDay,
    rootsOnly: state.rootsOnly === undefined ? undefined : String(state.rootsOnly),
    mine: state.mine ? "true" : undefined,
  };
}

export function effectiveRootsOnly(state: ListState): boolean {
  return state.rootsOnly ?? state.tab === "triage";
}

/** The exact query string sent to GET /v1/incidents. Booleans are omitted when false. */
export function toApiFilters(state: ListState, role: Role): IncidentFilters {
  const tab = tabsFor(role).find((t) => t.value === state.tab);
  const staff = isStaff(role);
  return {
    status: tab?.status,
    severity: state.severity,
    reporterId: staff ? state.reporterId : undefined,
    blueprintId: staff ? state.blueprintId : undefined,
    areaId: staff ? state.areaId : undefined,
    from: state.fromDay ? plantDayStartIso(state.fromDay) : undefined,
    // `to` is exclusive: send the start of the day after the last selected day.
    to: state.toDay ? plantDayStartIso(addDays(state.toDay, 1)) : undefined,
    rootsOnly: staff && effectiveRootsOnly(state) ? true : undefined,
    mine: staff && state.mine ? true : undefined,
    limit: 25,
  };
}

export const hasActiveFilters = (state: ListState): boolean =>
  Boolean(
    state.severity ||
    state.reporterId ||
    state.blueprintId ||
    state.areaId ||
    state.fromDay ||
    state.toDay ||
    state.mine ||
    state.rootsOnly !== undefined,
  );
