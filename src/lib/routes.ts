import type { IconName } from "@/components/ui";
import type { Role } from "@/lib/api";

/**
 * The route registry (guide §3). One place says which roles may open which section and what each
 * role's navigation looks like. The server still enforces every rule; this decides what to show.
 */
export type RouteKey =
  "report" | "incidents" | "actions" | "alerts" | "analytics" | "team" | "blueprints" | "account";

export interface RouteDef {
  key: RouteKey;
  /** File-system segment under src/app/(app)/. */
  segment: string;
  path: string;
  label: string;
  icon: IconName;
  roles: readonly Role[];
  /** Guide §5.1: analytics, team and blueprints are web-only; phones don't list them. */
  webOnly?: boolean;
}

const ALL: readonly Role[] = ["WORKER", "SUPERVISOR", "MANAGER"];
const STAFF: readonly Role[] = ["SUPERVISOR", "MANAGER"];

export const routes: Record<RouteKey, RouteDef> = {
  report: {
    key: "report",
    segment: "report",
    path: "/report",
    label: "Report a hazard",
    icon: "plus",
    roles: ALL,
  },
  incidents: {
    key: "incidents",
    segment: "incidents",
    path: "/incidents",
    label: "Incidents",
    icon: "clip",
    roles: ALL,
  },
  actions: {
    key: "actions",
    segment: "actions",
    path: "/actions",
    label: "Actions",
    icon: "tasks",
    roles: ALL,
  },
  alerts: {
    key: "alerts",
    segment: "alerts",
    path: "/alerts",
    label: "Alerts",
    icon: "bell",
    roles: ALL,
  },
  analytics: {
    key: "analytics",
    segment: "analytics",
    path: "/analytics",
    label: "Analytics",
    icon: "chart",
    roles: STAFF,
    webOnly: true,
  },
  team: {
    key: "team",
    segment: "team",
    path: "/team",
    label: "Team",
    icon: "users",
    roles: STAFF,
    webOnly: true,
  },
  blueprints: {
    key: "blueprints",
    segment: "admin",
    path: "/admin/blueprints",
    label: "Blueprints",
    icon: "map",
    roles: ["MANAGER"],
    webOnly: true,
  },
  account: {
    key: "account",
    segment: "account",
    path: "/account",
    label: "Account",
    icon: "user",
    roles: ALL,
  },
};

/**
 * Navigation order per role (guide §3.2). On a phone the web-only sections drop out, which leaves
 * five tabs for every role with Report in the middle: the one action everyone takes.
 */
const NAV_ORDER: Record<Role, readonly RouteKey[]> = {
  WORKER: ["incidents", "actions", "report", "alerts", "account"],
  SUPERVISOR: ["incidents", "actions", "report", "alerts", "analytics", "team", "account"],
  MANAGER: [
    "analytics",
    "incidents",
    "actions",
    "report",
    "alerts",
    "team",
    "blueprints",
    "account",
  ],
};

export function canAccess(role: Role | null | undefined, key: RouteKey): boolean {
  if (!role) return false; // deny by default: unknown role, no access
  return routes[key].roles.includes(role);
}

export interface NavItem extends RouteDef {
  /** Role-specific wording, e.g. workers see "My reports". */
  navLabel: string;
}

export function navFor(role: Role, options: { compact?: boolean } = {}): NavItem[] {
  return NAV_ORDER[role]
    .filter((key) => !(options.compact && routes[key].webOnly))
    .map((key) => {
      const def = routes[key];
      return {
        ...def,
        navLabel: key === "incidents" && role === "WORKER" ? "My reports" : def.label,
      };
    });
}

/** Home by role (guide §3.1). */
export function homeFor(role: Role, compact = false): string {
  if (role === "MANAGER") return compact ? "/incidents?tab=closure" : "/analytics";
  if (role === "SUPERVISOR") return "/incidents?tab=triage";
  return "/incidents";
}

/** Which section a pathname belongs to, or null for system pages and unknown paths. */
export function routeKeyForPath(pathname: string): RouteKey | null {
  const first = pathname.split("?")[0]?.split("/").filter(Boolean)[0];
  if (!first) return null;
  if (first === "admin") return "blueprints";
  const found = Object.values(routes).find((route) => route.segment === first);
  return found?.key ?? null;
}

/** Every path the app can land on after login: the allow-list for `next`. */
export function isKnownAppPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? "";
  if (pathname === "/") return true;
  return routeKeyForPath(pathname) !== null;
}
