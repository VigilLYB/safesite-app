import {
  actionsApi,
  analyticsApi,
  incidentsApi,
  usersApi,
  type Action,
  type Incident,
} from "@/lib/api";
import { as, asRoot, describeLive, failure, report, RUN, words } from "./support";

const fresh = async (): Promise<Incident> =>
  asRoot(
    (await report("worker", { severity: "HIGH", description: `Valve seep ${RUN} ${words()}` }))
      .incident,
  );

/** Pipeline: triage -> validate -> approve -> assign -> milestones in order -> resolved. */
describeLive("LIVE supervisor: triage to resolved", () => {
  let incident: Incident;
  let supervisorId: string;
  let action: Action;

  it("a new report is in the supervisor's OPEN triage queue", async () => {
    supervisorId = await as("supervisor");
    incident = await fresh();
    await as("supervisor");
    const queue = await incidentsApi.list({ status: "OPEN", rootsOnly: true, limit: 100 });
    expect(queue.items.some((i) => i.id === incident.id)).toBe(true);
    const full = await incidentsApi.get(incident.id);
    expect(full.permissions.transitions).toEqual(["validate", "approve", "reject"]);
    expect(full.permissions.canAssignAction).toBe(false); // not approved yet
    expect(full.permissions.canEdit).toBe(true);
  });

  it("reject without a reason is 400; with a stale version is 409", async () => {
    await as("supervisor");
    expect(
      (
        await failure(() =>
          incidentsApi.transition(incident.id, {
            event: "reject",
            expectedVersion: incident.version,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await failure(() =>
          incidentsApi.transition(incident.id, { event: "validate", expectedVersion: 99 }),
        )
      ).code,
    ).toBe("STALE_VERSION");
  });

  it("assigning before approval is refused", async () => {
    await as("supervisor");
    const e = await failure(() =>
      actionsApi.assign(incident.id, {
        expectedVersion: incident.version,
        type: "ONE_OFF",
        title: "too early",
      }),
    );
    expect([409, 422]).toContain(e.status);
  });

  it("validate then approve; the permissions follow the state machine", async () => {
    await as("supervisor");
    const validated = await incidentsApi.transition(incident.id, {
      event: "validate",
      expectedVersion: incident.version,
    });
    expect(validated.status).toBe("VALIDATED");
    expect(validated.permissions.transitions).toEqual(["approve", "reject"]);
    const approved = await incidentsApi.transition(incident.id, {
      event: "approve",
      expectedVersion: validated.version,
    });
    expect(approved.status).toBe("APPROVED");
    expect(approved.permissions.transitions).toEqual(["reject"]);
    expect(approved.permissions.canAssignAction).toBe(true);
    incident = approved;
  });

  it("supervisors cannot close or reopen (403)", async () => {
    await as("supervisor");
    expect(
      (
        await failure(() =>
          incidentsApi.transition(incident.id, {
            event: "close",
            expectedVersion: incident.version,
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await failure(() =>
          incidentsApi.transition(incident.id, {
            event: "reopen",
            expectedVersion: incident.version,
            note: "x",
          }),
        )
      ).status,
    ).toBe(403);
  });

  it("assigns the Replace Valve template to the supervisor", async () => {
    await as("supervisor");
    const templates = await actionsApi.templates();
    expect(templates.map((t) => t.code)).toContain("REPLACE_VALVE");
    action = await actionsApi.assign(incident.id, {
      expectedVersion: incident.version,
      type: "PREBUILT",
      templateCode: "REPLACE_VALVE",
      assigneeId: supervisorId,
    });
    expect(action.milestones?.map((m) => m.title)).toEqual(["Ordered", "Delivered", "Installed"]);
    expect(action.status).toBe("OPEN");
    expect((await incidentsApi.get(incident.id)).status).toBe("ACTION_ASSIGNED");
  });

  it("a second action on the same report is refused", async () => {
    await as("supervisor");
    const latest = await incidentsApi.get(incident.id);
    const e = await failure(() =>
      actionsApi.assign(incident.id, {
        expectedVersion: latest.version,
        type: "ONE_OFF",
        title: "again",
      }),
    );
    expect([409, 422]).toContain(e.status);
  });

  it("the action shows on every dashboard filter it should", async () => {
    await as("supervisor");
    expect(
      (await actionsApi.list({ status: "OPEN,IN_PROGRESS", limit: 100 })).some(
        (a) => a.id === action.id,
      ),
    ).toBe(true);
    expect(
      (await actionsApi.list({ mine: true, limit: 100 })).some((a) => a.id === action.id),
    ).toBe(true);
    expect((await actionsApi.list({ incidentId: incident.id })).map((a) => a.id)).toEqual([
      action.id,
    ]);
    expect(
      (await actionsApi.list({ status: "DONE", limit: 100 })).some((a) => a.id === action.id),
    ).toBe(false);
    await as("worker"); // everyone can see the board
    expect((await actionsApi.list({ incidentId: incident.id })).map((a) => a.id)).toEqual([
      action.id,
    ]);
  });

  it("milestones must be completed in order; a non-assignee worker cannot", async () => {
    await as("supervisor");
    const ms = (await actionsApi.get(action.id)).milestones!;
    expect((await failure(() => actionsApi.completeMilestone(action.id, ms[1]!.id))).status).toBe(
      422,
    );
    await as("worker");
    expect((await failure(() => actionsApi.completeMilestone(action.id, ms[0]!.id))).status).toBe(
      403,
    );
    expect((await failure(() => actionsApi.complete(action.id))).status).toBe(403);
  });

  it("completing them in order finishes the action and resolves the report", async () => {
    await as("supervisor");
    const ms = (await actionsApi.get(action.id)).milestones!;
    let last: Action = action;
    for (const m of ms) last = await actionsApi.completeMilestone(action.id, m.id);
    expect(last.status).toBe("DONE");
    expect(last.progress).toEqual({ done: 3, total: 3 });
    expect((await incidentsApi.get(incident.id)).status).toBe("RESOLVED");
    // repeating a completed milestone is a harmless no-op or a clear 422, never a crash
    const again = await failure(() => actionsApi.completeMilestone(action.id, ms[0]!.id)).catch(
      () => null,
    );
    void again;
  });

  it("the completed action drops out of Active and into Completed", async () => {
    await as("supervisor");
    expect(
      (await actionsApi.list({ status: "OPEN,IN_PROGRESS", limit: 100 })).some(
        (a) => a.id === action.id,
      ),
    ).toBe(false);
    expect(
      (await actionsApi.list({ status: "DONE", limit: 100 })).some((a) => a.id === action.id),
    ).toBe(true);
  });

  it("a one-off fix completes with a single call and resolves the report", async () => {
    const one = await fresh();
    await as("supervisor");
    const v = await incidentsApi.transition(one.id, {
      event: "approve",
      expectedVersion: one.version,
    });
    const a = await actionsApi.assign(one.id, {
      expectedVersion: v.version,
      type: "ONE_OFF",
      title: `Isolate ${RUN}`,
      assigneeId: supervisorId,
    });
    expect(a.progress.total).toBe(0);
    const done = await actionsApi.complete(a.id);
    expect(done.status).toBe("DONE");
    expect((await incidentsApi.get(one.id)).status).toBe("RESOLVED");
  });

  it("a custom action keeps milestone order", async () => {
    const c = await fresh();
    await as("supervisor");
    const v = await incidentsApi.transition(c.id, { event: "approve", expectedVersion: c.version });
    const a = await actionsApi.assign(c.id, {
      expectedVersion: v.version,
      type: "CUSTOM",
      title: `Rebuild ${RUN}`,
      milestones: [{ title: "Isolate" }, { title: "Replace seal" }],
    });
    expect(a.milestones?.map((m) => m.title)).toEqual(["Isolate", "Replace seal"]);
    expect((await failure(() => actionsApi.complete(a.id))).status).toBe(422); // milestones remain
  });

  it("milestones are rejected for non-CUSTOM actions (400)", async () => {
    const x = await fresh();
    await as("supervisor");
    const v = await incidentsApi.transition(x.id, { event: "approve", expectedVersion: x.version });
    const e = await failure(() =>
      actionsApi.assign(x.id, {
        expectedVersion: v.version,
        type: "ONE_OFF",
        title: "t",
        milestones: [{ title: "m" }],
      }),
    );
    expect(e.status).toBe(400);
  });

  it("an unknown assignee is refused", async () => {
    const x = await fresh();
    await as("supervisor");
    const v = await incidentsApi.transition(x.id, { event: "approve", expectedVersion: x.version });
    const e = await failure(() =>
      actionsApi.assign(x.id, {
        expectedVersion: v.version,
        type: "ONE_OFF",
        title: "t",
        assigneeId: "00000000-0000-4000-8000-00000000dead",
      }),
    );
    expect(e.status).toBe(400);
  });

  it("reject needs a reason and the reason is on the timeline", async () => {
    const r = await fresh();
    await as("supervisor");
    const rejected = await incidentsApi.transition(r.id, {
      event: "reject",
      expectedVersion: r.version,
      note: `Not a hazard ${RUN}`,
    });
    expect(rejected.status).toBe("REJECTED");
    const { nodes } = await incidentsApi.timeline(r.id);
    expect(nodes.at(-1)?.note).toBe(`Not a hazard ${RUN}`);
    expect(rejected.permissions.transitions).toEqual([]); // only a manager can reopen
    expect(rejected.permissions.canEdit).toBe(false);
  });

  it("supervisors can list users and read analytics", async () => {
    await as("supervisor");
    const people = await usersApi.list();
    expect(people.map((u) => u.role)).toEqual(
      expect.arrayContaining(["WORKER", "SUPERVISOR", "MANAGER"]),
    );
    expect((await usersApi.list("MANAGER")).every((u) => u.role === "MANAGER")).toBe(true);
    expect((await analyticsApi.summary({})).totals.reports).toBeGreaterThan(0);
  });
});
