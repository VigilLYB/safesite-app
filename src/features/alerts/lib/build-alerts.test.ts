import type { Action, Incident, IncidentSummary } from "@/lib/api";
import {
  buildStaffAlerts,
  buildWorkerAlerts,
  MAX_SEEN,
  rememberSeen,
  sortAlerts,
  unreadAlerts,
} from "./build-alerts";

const person = { id: "w1", fullName: "Ravi Kumar" };
const action = (over: Partial<Action> = {}): Action =>
  ({
    id: "a1",
    title: "Replace valve",
    status: "OPEN",
    isOverdue: false,
    dueAt: "2026-11-20T00:00:00Z",
    createdAt: "2026-11-12T09:00:00Z",
    assignee: person,
    assignedBy: { id: "s1", fullName: "Anita" },
    ...over,
  }) as Action;
const report = (over: Record<string, unknown> = {}): Incident =>
  ({
    id: "r1",
    version: 3,
    title: "Leak",
    category: null,
    reporter: person,
    lastChange: {
      nodeType: "APPROVED",
      label: "Manager Approved",
      actorRole: "MANAGER",
      at: "2026-11-12T10:00:00Z",
    },
    ...over,
  }) as unknown as Incident;
const summary = (over: Partial<IncidentSummary> = {}): IncidentSummary =>
  ({
    id: "r1",
    version: 2,
    title: "Hot machine",
    category: null,
    reporter: person,
    createdAt: "2026-11-12T08:00:00Z",
    ...over,
  }) as IncidentSummary;

describe("worker alerts", () => {
  it("an assigned action is an alert at the time it was assigned", () => {
    const [a] = buildWorkerAlerts({ userId: "w1", reports: [], myActions: [action()] });
    expect(a).toMatchObject({
      id: "action-assigned:a1",
      kind: "action-assigned",
      href: "/actions/a1",
      at: "2026-11-12T09:00:00Z",
    });
    expect(a?.body).toContain("Replace valve");
  });

  it("an overdue action also raises an overdue alert dated at its due time", () => {
    const alerts = buildWorkerAlerts({
      userId: "w1",
      reports: [],
      myActions: [action({ isOverdue: true })],
    });
    expect(alerts.map((x) => x.kind).sort()).toEqual(["action-assigned", "action-overdue"]);
    expect(alerts.find((x) => x.kind === "action-overdue")?.at).toBe("2026-11-20T00:00:00Z");
  });

  it("finished actions are not alerts", () => {
    expect(
      buildWorkerAlerts({ userId: "w1", reports: [], myActions: [action({ status: "DONE" })] }),
    ).toEqual([]);
  });

  it("a supervisor's decision on the worker's report is an alert, with the API's own label", () => {
    const [a] = buildWorkerAlerts({ userId: "w1", reports: [report()], myActions: [] });
    expect(a).toMatchObject({
      id: "report-update:r1:v3",
      title: "Manager Approved",
      body: "Leak",
      href: "/incidents/r1",
    });
  });

  it("the worker's own edits, system noise and untouched reports are not alerts", () => {
    const own = report({
      lastChange: {
        nodeType: "EDITED",
        label: "Worker Edited",
        actorRole: "WORKER",
        at: "2026-11-12T10:00:00Z",
      },
    });
    const system = report({
      id: "r2",
      lastChange: {
        nodeType: "TRANSCRIBED",
        label: "AI Transcribed Audio",
        actorRole: "SYSTEM",
        at: "2026-11-12T10:00:00Z",
      },
    });
    const untouched = report({ id: "r3", version: 1 });
    expect(
      buildWorkerAlerts({ userId: "w1", reports: [own, system, untouched], myActions: [] }),
    ).toEqual([]);
  });

  it("a resolved report (closed by the system when its action finishes) is an alert", () => {
    const resolved = report({
      lastChange: {
        nodeType: "RESOLVED",
        label: "Resolved",
        actorRole: "SYSTEM",
        at: "2026-11-12T12:00:00Z",
      },
    });
    expect(buildWorkerAlerts({ userId: "w1", reports: [resolved], myActions: [] })).toHaveLength(1);
  });

  it("someone else's report never produces an alert", () => {
    expect(buildWorkerAlerts({ userId: "other", reports: [report()], myActions: [] })).toEqual([]);
  });
});

describe("staff alerts", () => {
  it("new incidents waiting for review, with who reported them", () => {
    const [a] = buildStaffAlerts({
      role: "SUPERVISOR",
      waiting: [summary()],
      resolved: [],
      overdueActions: [],
    });
    expect(a).toMatchObject({ id: "new-report:r1", kind: "new-report", href: "/incidents/r1" });
    expect(a?.body).toContain("Ravi Kumar");
  });

  it("only a manager is told a resolved report is ready to close", () => {
    const resolved = [summary({ id: "r9", version: 4 })];
    expect(
      buildStaffAlerts({ role: "SUPERVISOR", waiting: [], resolved, overdueActions: [] }),
    ).toEqual([]);
    expect(
      buildStaffAlerts({ role: "MANAGER", waiting: [], resolved, overdueActions: [] }).map(
        (x) => x.kind,
      ),
    ).toEqual(["ready-to-close"]);
  });

  it("overdue actions name the assignee, or say Unassigned", () => {
    const alerts = buildStaffAlerts({
      role: "SUPERVISOR",
      waiting: [],
      resolved: [],
      overdueActions: [
        action({ id: "a1", isOverdue: true }),
        action({ id: "a2", isOverdue: true, assignee: null }),
      ],
    });
    expect(alerts.map((x) => x.kind)).toEqual(["action-overdue", "action-overdue"]);
    expect(alerts.some((x) => x.body.includes("Unassigned"))).toBe(true);
    expect(alerts.some((x) => x.body.includes("Ravi Kumar"))).toBe(true);
  });
});

describe("ordering and unread tracking", () => {
  it("newest first, with a stable tie-break", () => {
    const out = sortAlerts([
      { id: "b", at: "2026-11-12T10:00:00Z" },
      { id: "a", at: "2026-11-12T10:00:00Z" },
      { id: "c", at: "2026-11-12T11:00:00Z" },
    ] as never);
    expect(out.map((x) => x.id)).toEqual(["c", "a", "b"]);
  });

  it("unread is exactly the alerts whose id has not been seen", () => {
    const alerts = [{ id: "x" }, { id: "y" }] as never;
    expect(unreadAlerts(alerts, new Set(["x"])).map((a) => a.id)).toEqual(["y"]);
    expect(unreadAlerts(alerts, new Set())).toHaveLength(2);
  });

  it("a changed version is a NEW alert even for the same report", () => {
    const v3 = buildWorkerAlerts({ userId: "w1", reports: [report()], myActions: [] });
    const v4 = buildWorkerAlerts({
      userId: "w1",
      reports: [report({ version: 4 })],
      myActions: [],
    });
    expect(unreadAlerts(v4, new Set(v3.map((a) => a.id)))).toHaveLength(1);
  });

  it("remembers the newest ids and never grows past the cap", () => {
    const many = Array.from({ length: MAX_SEEN + 15 }, (_, i) => ({ id: `id${i}` })) as never;
    const seen = rememberSeen(new Set(["old"]), many);
    expect(seen.size).toBe(MAX_SEEN);
    expect(seen.has("id0")).toBe(true);
    expect(seen.has("old")).toBe(false);
  });
});
