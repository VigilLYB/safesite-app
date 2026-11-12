import { actionsApi, analyticsApi, incidentsApi, type Incident } from "@/lib/api";
import { request } from "@/lib/api/client";
import { anything, endpoints } from "./raw";
import { as, defaultBlueprint, describeLive, failure, report, RUN, words } from "./support";

/** Drive a fresh report all the way to RESOLVED as staff. */
async function resolved(): Promise<Incident> {
  const { incident } = await report("worker", { description: `Closure test ${RUN} ${words()}` });
  const sup = await as("supervisor");
  const approved = await incidentsApi.transition(incident.id, {
    event: "approve",
    expectedVersion: incident.version,
  });
  const action = await actionsApi.assign(incident.id, {
    expectedVersion: approved.version,
    type: "ONE_OFF",
    title: `Fix ${RUN}`,
    assigneeId: sup,
  });
  await actionsApi.complete(action.id);
  await as("manager");
  return incidentsApi.get(incident.id);
}

/** Pipeline: resolved -> manager closes -> reopens with a reason -> back to OPEN. */
describeLive("LIVE manager: close, reopen, analytics", () => {
  let incident: Incident;

  it("a resolved report is waiting for the manager, who alone can close or reopen it", async () => {
    incident = await resolved();
    expect(incident.status).toBe("RESOLVED");
    expect([...incident.permissions.transitions].sort()).toEqual(["close", "reopen"]);
    const queue = await incidentsApi.list({ status: "RESOLVED", limit: 100 });
    expect(queue.items.some((i) => i.id === incident.id)).toBe(true);
    expect(incident.permissions.canEdit).toBe(false); // nobody edits a resolved report
  });

  it("closes without a reason", async () => {
    await as("manager");
    incident = await incidentsApi.transition(incident.id, {
      event: "close",
      expectedVersion: incident.version,
    });
    expect(incident.status).toBe("CLOSED");
    expect(incident.permissions.transitions).toEqual(["reopen"]);
  });

  it("reopen needs a reason (400), then returns the report to OPEN", async () => {
    await as("manager");
    expect(
      (
        await failure(() =>
          incidentsApi.transition(incident.id, {
            event: "reopen",
            expectedVersion: incident.version,
          }),
        )
      ).status,
    ).toBe(400);
    incident = await incidentsApi.transition(incident.id, {
      event: "reopen",
      expectedVersion: incident.version,
      note: `Leak returned ${RUN}`,
    });
    expect(incident.status).toBe("OPEN");
    const { nodes } = await incidentsApi.timeline(incident.id);
    expect(nodes.at(-1)).toMatchObject({ nodeType: "REOPENED", note: `Leak returned ${RUN}` });
    // the old action stays Done and a new action needs Validate/Approve first
    expect(incident.permissions.canAssignAction).toBe(false);
    expect(incident.permissions.transitions).toEqual(
      expect.arrayContaining(["validate", "approve"]),
    );
  });

  it("a manager can reopen a rejected report", async () => {
    const { incident: fresh } = await report("worker", {
      description: `Reject me ${RUN} ${words()}`,
    });
    await as("supervisor");
    const rejected = await incidentsApi.transition(fresh.id, {
      event: "reject",
      expectedVersion: fresh.version,
      note: "wrong plant",
    });
    await as("manager");
    const reopened = await incidentsApi.transition(fresh.id, {
      event: "reopen",
      expectedVersion: rejected.version,
      note: "it was right",
    });
    expect(reopened.status).toBe("OPEN");
  });

  it("the status filter really filters (regression: it was once ignored)", async () => {
    await as("manager");
    for (const status of ["CLOSED", "OPEN", "OPEN,VALIDATED", "RESOLVED,CLOSED"]) {
      const { items } = await incidentsApi.list({ status, limit: 100 });
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => status.split(",").includes(i.status))).toBe(true);
    }
  });

  it("filters by severity, date range (exclusive end) and reporter", async () => {
    await as("manager");
    const { incident: high } = await report("worker", {
      severity: "CRITICAL",
      description: `Crit ${RUN} ${words()}`,
    });
    await as("manager");
    const critical = await incidentsApi.list({ severity: "CRITICAL", limit: 100 });
    expect(critical.items.every((i) => i.severity === "CRITICAL")).toBe(true);
    expect(critical.items.some((i) => i.id === high.id)).toBe(true);
    const future = await incidentsApi.list({ from: "2999-01-01T00:00:00.000Z", limit: 100 });
    expect(future.items).toHaveLength(0);
    const byWho = await incidentsApi.list({ reporterId: high.reporter.id, limit: 100 });
    expect(byWho.items.every((i) => i.reporter.id === high.reporter.id)).toBe(true);
    const mine = await incidentsApi.list({ mine: true, limit: 100 });
    expect(mine.items.every((i) => i.reporter.fullName === "Vikram Rao")).toBe(true);
  });

  it("summary totals are consistent and respect the shift filter", async () => {
    await as("manager");
    const all = await analyticsApi.summary({});
    expect(all.timezone).toBe("Asia/Kolkata");
    expect(all.totals.reports).toBeGreaterThan(0);
    expect(all.byStatus.reduce((n, b) => n + b.count, 0)).toBe(all.totals.reports);
    const shiftC = await analyticsApi.summary({ shift: "C" });
    expect(shiftC.totals.reports).toBeLessThanOrEqual(all.totals.reports);
    expect(shiftC.byShift.every((b) => b.key === "C")).toBe(true);
    const empty = await analyticsApi.summary({
      from: "2999-01-01T00:00:00.000Z",
      to: "2999-02-01T00:00:00.000Z",
    });
    expect(empty.totals.reports).toBe(0);
    expect(empty.actions.avgHoursToClose).toBeNull(); // unknown, not 0
  });

  it("summary rejects from >= to and an area filter it does not support", async () => {
    await as("manager");
    const backwards = await failure(() =>
      analyticsApi.summary({ from: "2026-11-12T00:00:00.000Z", to: "2026-11-01T00:00:00.000Z" }),
    );
    expect(backwards.status).toBe(400);
    const area = await failure(() =>
      request({
        endpoint: endpoints.summary,
        query: { areaId: "00000000-0000-4000-8000-000000000000" },
        schema: anything,
      }),
    );
    expect(area.status).toBe(400); // the summary has no area filter (strict query)
  });

  it("heatmap needs a blueprint, lists areas, and honours cell size", async () => {
    await as("manager");
    const bp = await defaultBlueprint();
    const heat = await analyticsApi.heatmap({ blueprintId: bp.id, cellSize: 100 });
    expect(heat.cellSize).toBe(100);
    expect(heat.areas.length).toBe(bp.areas.length); // every area, even with no reports
    expect(heat.cells.every((c) => c.intensity >= 0 && c.intensity <= 1)).toBe(true);
    expect(
      (await failure(() => analyticsApi.heatmap({ blueprintId: bp.id, cellSize: 5 }))).status,
    ).toBe(400);
    expect(
      (await failure(() => analyticsApi.heatmap({ blueprintId: bp.id, cellSize: 501 }))).status,
    ).toBe(400);
  });

  it("the area behind a heatmap row is filterable on the incidents list", async () => {
    await as("manager");
    const bp = await defaultBlueprint();
    const heat = await analyticsApi.heatmap({ blueprintId: bp.id });
    const hot = [...heat.areas].sort((a, b) => b.count - a.count)[0];
    if (hot && hot.count > 0) {
      const { items } = await incidentsApi.list({
        blueprintId: bp.id,
        areaId: hot.areaId,
        limit: 100,
      });
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.areaName === hot.name)).toBe(true);
    }
  });
});
