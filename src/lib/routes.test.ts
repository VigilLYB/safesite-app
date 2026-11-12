import type { Role } from "@/lib/api";
import {
  canAccess,
  homeFor,
  isKnownAppPath,
  navFor,
  routeKeyForPath,
  routes,
  type RouteKey,
} from "./routes";
import { safeNext } from "./safe-next";

const ROLES: Role[] = ["WORKER", "SUPERVISOR", "MANAGER"];

describe("RBAC matrix (guide §3)", () => {
  const expected: Record<RouteKey, Role[]> = {
    report: ROLES,
    incidents: ROLES,
    actions: ROLES,
    alerts: ROLES,
    account: ROLES,
    analytics: ["SUPERVISOR", "MANAGER"],
    team: ["SUPERVISOR", "MANAGER"],
    blueprints: ["MANAGER"],
  };
  it.each(Object.keys(expected) as RouteKey[])("%s is reachable only by %j", (key) => {
    for (const role of ROLES) expect(canAccess(role, key)).toBe(expected[key].includes(role));
  });
  it("denies by default when the role is unknown", () => {
    for (const key of Object.keys(routes) as RouteKey[]) {
      expect(canAccess(null, key)).toBe(false);
      expect(canAccess(undefined, key)).toBe(false);
      expect(canAccess("ADMIN" as Role, key)).toBe(false);
    }
  });
  it("lists only routes the role can open, in the documented order", () => {
    expect(navFor("WORKER").map((n) => n.navLabel)).toEqual([
      "My reports",
      "Actions",
      "Report a hazard",
      "Alerts",
      "Account",
    ]);
    expect(navFor("SUPERVISOR").map((n) => n.key)).toEqual([
      "incidents",
      "actions",
      "report",
      "alerts",
      "analytics",
      "team",
      "account",
    ]);
    expect(navFor("MANAGER").map((n) => n.key)).toEqual([
      "analytics",
      "incidents",
      "actions",
      "report",
      "alerts",
      "team",
      "blueprints",
      "account",
    ]);
    for (const role of ROLES)
      for (const item of navFor(role)) expect(canAccess(role, item.key)).toBe(true);
  });
  it("on a phone every role gets exactly five tabs with Report in the middle", () => {
    for (const role of ROLES) {
      const tabs = navFor(role, { compact: true }).map((n) => n.key);
      expect(tabs).toEqual(["incidents", "actions", "report", "alerts", "account"]);
      expect(tabs[Math.floor(tabs.length / 2)]).toBe("report");
    }
  });
  it("sends each role home", () => {
    expect(homeFor("WORKER")).toBe("/incidents");
    expect(homeFor("SUPERVISOR")).toBe("/incidents?tab=triage");
    expect(homeFor("MANAGER")).toBe("/analytics");
  });
  it("maps paths to sections", () => {
    expect(routeKeyForPath("/admin/blueprints/new")).toBe("blueprints");
    expect(routeKeyForPath("/incidents/abc")).toBe("incidents");
    expect(routeKeyForPath("/nope")).toBeNull();
    expect(isKnownAppPath("/analytics/heatmap?x=1")).toBe(true);
  });
});

describe("safeNext", () => {
  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "/javascript:alert(1)",
    "evil",
    "",
    "/unknown",
    "/a\nb",
  ])("rejects %j", (value) => expect(safeNext(value, "/home")).toBe("/home"));
  it("accepts app paths, with a query", () => {
    expect(safeNext("/incidents/123?tab=history", "/home")).toBe("/incidents/123?tab=history");
    expect(safeNext(["/actions"], "/home")).toBe("/actions");
    expect(safeNext(undefined, "/home")).toBe("/home");
  });
});
