import type { Action, Incident, IncidentSummary, Role } from "@/lib/api";
import type { IconName } from "@/components/ui";
import { displayTitle, formatDate } from "@/lib/format";

/**
 * The backend has no notifications endpoint, so alerts are derived from data the app already
 * reads: who needs to act on what, and what changed on the viewer's own reports. Pure and
 * deterministic so it can be tested; the hook fetches, this decides.
 */
export type AlertKind =
  "report-update" | "action-assigned" | "action-overdue" | "new-report" | "ready-to-close";

export interface AppAlert {
  /** Stable across refreshes (kind + entity + version), so "unread" never flickers. */
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  /** ISO time the thing happened (not when it was fetched). */
  at: string;
  href: string;
  icon: IconName;
}

/** Newest first; ties broken by id so the order is stable. */
export const sortAlerts = (alerts: readonly AppAlert[]): AppAlert[] =>
  [...alerts].sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));

const isOpen = (action: Pick<Action, "status">) =>
  action.status === "OPEN" || action.status === "IN_PROGRESS";

function actionAlerts(actions: readonly Action[], kind: "mine" | "overdue-only"): AppAlert[] {
  const out: AppAlert[] = [];
  for (const action of actions.filter(isOpen)) {
    if (kind === "mine") {
      out.push({
        id: `action-assigned:${action.id}`,
        kind: "action-assigned",
        title: "Action assigned to you",
        body: `${action.title}${action.dueAt ? ` · due ${formatDate(action.dueAt)}` : ""}`,
        at: action.createdAt,
        href: `/actions/${action.id}`,
        icon: "tasks",
      });
    }
    if (action.isOverdue && action.dueAt) {
      out.push({
        id: `action-overdue:${action.id}`,
        kind: "action-overdue",
        title: "Action overdue",
        body: `${action.title}${action.assignee ? ` · ${action.assignee.fullName}` : " · Unassigned"}`,
        at: action.dueAt,
        href: `/actions/${action.id}`,
        icon: "warn",
      });
    }
  }
  return out;
}

/**
 * Worker: actions assigned to them (and overdue ones), plus decisions people made on their own
 * reports. Their own edits, and system noise such as transcription, are not alerts.
 */
export function buildWorkerAlerts(input: {
  userId: string;
  /** Full reports (detail) so `lastChange` has a real time and label. */
  reports: readonly Incident[];
  myActions: readonly Action[];
}): AppAlert[] {
  const alerts = actionAlerts(input.myActions, "mine");
  for (const report of input.reports) {
    const change = report.lastChange;
    if (report.reporter.id !== input.userId || report.version <= 1) continue;
    const human = change.actorRole === "SUPERVISOR" || change.actorRole === "MANAGER";
    if (!human && change.nodeType !== "RESOLVED") continue;
    alerts.push({
      id: `report-update:${report.id}:v${report.version}`,
      kind: "report-update",
      title: change.label,
      body: displayTitle(report),
      at: change.at,
      href: `/incidents/${report.id}`,
      icon: "clip",
    });
  }
  return sortAlerts(alerts);
}

/** Staff: reports waiting for a decision, resolved reports a manager can close, overdue actions. */
export function buildStaffAlerts(input: {
  role: Role;
  waiting: readonly IncidentSummary[];
  resolved: readonly IncidentSummary[];
  overdueActions: readonly Action[];
}): AppAlert[] {
  const alerts: AppAlert[] = input.waiting.map((report) => ({
    id: `new-report:${report.id}`,
    kind: "new-report",
    title: "New incident waiting for review",
    body: `${displayTitle(report)} · ${report.reporter.fullName}`,
    at: report.createdAt,
    href: `/incidents/${report.id}`,
    icon: "clip",
  }));
  if (input.role === "MANAGER") {
    for (const report of input.resolved) {
      alerts.push({
        id: `ready-to-close:${report.id}:v${report.version}`,
        kind: "ready-to-close",
        title: "Ready to close",
        body: displayTitle(report),
        at: report.createdAt,
        href: `/incidents/${report.id}`,
        icon: "check",
      });
    }
  }
  alerts.push(...actionAlerts(input.overdueActions, "overdue-only"));
  return sortAlerts(alerts);
}

/** Alerts the person has not seen yet. Ids are stable (kind + entity + version), so this is exact. */
export const unreadAlerts = (alerts: readonly AppAlert[], seen: ReadonlySet<string>): AppAlert[] =>
  alerts.filter((alert) => !seen.has(alert.id));

/** Keep the newest ids only: the persisted set must stay small (SecureStore values are tiny). */
export const MAX_SEEN = 30;
export function rememberSeen(seen: ReadonlySet<string>, alerts: readonly AppAlert[]): Set<string> {
  const ordered = [...alerts.map((alert) => alert.id), ...seen];
  return new Set([...new Set(ordered)].slice(0, MAX_SEEN));
}
