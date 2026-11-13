import type { ActionFilters, Role } from "@/lib/api";
import { isStaff } from "@/lib/permissions";
import { isUuid } from "@/lib/validation";

const ACTIVE = "OPEN,IN_PROGRESS";

/** Guide §4.6. Workers see all actions; their default is the ones assigned to them. */
export const WORKER_ACTION_TABS = [
  { value: "mine", label: "Assigned to me", filters: { mine: true, status: ACTIVE } },
  { value: "active", label: "All active", filters: { status: ACTIVE } },
  { value: "done", label: "Completed", filters: { status: "DONE" } },
] as const;

export const STAFF_ACTION_TABS = [
  { value: "active", label: "Active", filters: { status: ACTIVE, sort: "assigned" } },
  { value: "overdue", label: "Overdue", filters: { overdue: true } },
  { value: "mine", label: "Assigned to me", filters: { mine: true } },
  { value: "done", label: "Completed", filters: { status: "DONE" } },
  { value: "all", label: "All", filters: {} },
] as const;

export type ActionTab =
  (typeof WORKER_ACTION_TABS)[number]["value"] | (typeof STAFF_ACTION_TABS)[number]["value"];

export const actionTabsFor = (role: Role) =>
  isStaff(role) ? STAFF_ACTION_TABS : WORKER_ACTION_TABS;

export const defaultActionTab = (role: Role): ActionTab => (isStaff(role) ? "active" : "mine");

export const ACTIONS_PAGE_SIZE = 50;

export interface ActionListState {
  tab: ActionTab;
  assigneeId?: string | undefined;
  incidentId?: string | undefined;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseActionParams(raw: Raw, role: Role): ActionListState {
  const tabs = actionTabsFor(role);
  const wanted = first(raw.tab);
  const tab = (tabs.find((t) => t.value === wanted)?.value ?? defaultActionTab(role)) as ActionTab;
  const assignee = first(raw.assigneeId);
  const incident = first(raw.incidentId);
  const staff = isStaff(role);
  return {
    tab,
    // Workers have no assignee filter: GET /v1/users is forbidden to them.
    assigneeId: staff && assignee && isUuid(assignee) ? assignee : undefined,
    incidentId: incident && isUuid(incident) ? incident : undefined,
  };
}

/** `mine` wins over `assigneeId` on the server, so the two are never sent together. */
export function toActionFilters(state: ActionListState, role: Role): ActionFilters {
  const tab = actionTabsFor(role).find((t) => t.value === state.tab);
  const preset = (tab?.filters ?? {}) as ActionFilters;
  const mine = preset.mine === true;
  return {
    ...preset,
    assigneeId: !mine && isStaff(role) ? state.assigneeId : undefined,
    incidentId: state.incidentId,
    limit: ACTIONS_PAGE_SIZE,
  };
}
