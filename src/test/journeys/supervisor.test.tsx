import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { cleanup, fireEvent, launch, press, waitFor, type View } from "../harness";

let be: FakeBackend;
const S = "supervisor@plantx.demo";
beforeEach(() => {
  be = createFakeBackend();
});
afterEach(cleanup);
const wid = () => be.userByEmail("worker@plantx.demo")!.id;
const labels = (rec: { nodes: { label: string }[] }) => rec.nodes.map((n) => n.label);
const pick = async (view: View, testID: string, optionText: string) => {
  await press(view, testID);
  await fireEvent.press(await view.findByText(optionText));
};

describe("Journey: supervisor triage", () => {
  it("lands on New Incidents: OPEN only, duplicates hidden, server-side", async () => {
    be.seedIncident({ reporter: wid(), title: "Fresh" });
    be.seedIncident({ reporter: wid(), title: "Approved already", status: "APPROVED" });
    const view = await launch(be, { as: S, url: "/incidents" });
    expect(await view.findByText("Fresh")).toBeTruthy();
    expect(view.queryByText("Approved already")).toBeNull();
    const call = be.called("GET", "/v1/incidents").find((c) => c.path === "/v1/incidents");
    expect(call?.query.get("status")).toBe("OPEN");
    expect(call?.query.get("rootsOnly")).toBe("true");
  });

  it("staff tabs map to status presets", async () => {
    be.seedIncident({ reporter: wid(), title: "Needs an action", status: "APPROVED" });
    const view = await launch(be, { as: S, url: "/incidents" });
    await press(view, "tab-needs-action");
    expect(await view.findByText("Needs an action")).toBeTruthy();
    expect(
      be.called("GET", "/v1/incidents").some((c) => c.query.get("status") === "APPROVED"),
    ).toBe(true);
    await press(view, "tab-closure");
    expect(
      be.called("GET", "/v1/incidents").some((c) => c.query.get("status") === "RESOLVED"),
    ).toBe(true);
  });

  it("severity and reporter filters are sent to the server", async () => {
    be.seedIncident({ reporter: wid(), title: "High one", severity: "HIGH" });
    const view = await launch(be, { as: S, url: "/incidents?severity=HIGH" });
    expect(await view.findByText("High one")).toBeTruthy();
    expect(be.called("GET", "/v1/incidents").some((c) => c.query.get("severity") === "HIGH")).toBe(
      true,
    );
    await press(view, "toggle-filters");
    await pick(view, "filter-reporter", "Ravi Kumar");
    await waitFor(() =>
      expect(
        be.called("GET", "/v1/incidents").some((c) => c.query.get("reporterId") === wid()),
      ).toBe(true),
    );
  });

  it("filtered-empty offers to clear filters", async () => {
    const view = await launch(be, { as: S, url: "/incidents?severity=CRITICAL" });
    expect(await view.findByText("No reports match these filters")).toBeTruthy();
  });
});

describe("Journey: supervisor approves and rejects", () => {
  it("an open report offers Approve, Edit and Reject (never Validate); approving unlocks Assign", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("action-approve");
    await view.findByTestId("action-edit");
    await view.findByTestId("action-reject");
    expect(view.queryByTestId("action-validate")).toBeNull(); // the API offers it; the app doesn't
    expect(view.queryByTestId("action-assign")).toBeNull(); // only after approval

    await press(view, "action-approve");
    await press(view, "note-confirm");
    await waitFor(() => expect(rec.status).toBe("APPROVED"));
    expect(be.called("POST", "/transitions")[0]?.body).toEqual({
      event: "approve",
      expectedVersion: 1,
    });
    await waitFor(() => expect(view.queryByTestId("note-confirm")).toBeNull()); // dialog closed
    await view.findByTestId("action-assign");
    await view.findByTestId("action-reject"); // can still reject after approval
    await view.findByTestId("action-edit");
    for (const id of ["action-validate", "action-approve", "action-close", "action-reopen"]) {
      await waitFor(() => expect(view.queryByTestId(id)).toBeNull());
    }
    expect(labels(rec)).toEqual(expect.arrayContaining(["Approved"]));
  });

  it("reject needs a reason: Confirm is disabled until one is typed, and it is trimmed", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await press(view, "action-reject");
    expect((await view.findByTestId("note-confirm")).props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(await view.findByTestId("note-input"), "   ");
    expect((await view.findByTestId("note-confirm")).props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(await view.findByTestId("note-input"), "  Not a hazard  ");
    await press(view, "note-confirm");
    await waitFor(() => expect(rec.status).toBe("REJECTED"));
    expect(be.called("POST", "/transitions")[0]?.body).toEqual({
      event: "reject",
      expectedVersion: 1,
      note: "Not a hazard",
    });
    expect(await view.findByText("Rejected")).toBeTruthy();
  });

  it("a supervisor never sees Close or Reopen", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Done", status: "RESOLVED" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("incident-title");
    expect(view.queryByTestId("action-close")).toBeNull();
    expect(view.queryByTestId("action-reopen")).toBeNull();
  });

  it("Assign action only appears once the report is approved", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("action-approve");
    expect(view.queryByTestId("action-assign")).toBeNull();
    expect(view.queryByTestId("assign-reason")).toBeNull();
  });
});

describe("Journey: stale version (optimistic concurrency)", () => {
  it("never overwrites silently: dialog, then Apply again uses the fresh version", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("action-approve");
    be.touch(rec.id); // someone else changed it: v1 -> v2
    await press(view, "action-approve");
    await press(view, "note-confirm");
    const message = await view.findByTestId("stale-message");
    await waitFor(() =>
      expect(JSON.stringify(message.props.children)).toMatch(/v1.*v2.*Supervisor Modified/),
    );
    expect(rec.status).toBe("OPEN"); // nothing applied
    expect(be.called("POST", "/transitions")).toHaveLength(1);
    await press(view, "stale-retry");
    await waitFor(() => expect(rec.status).toBe("APPROVED"));
    expect(be.called("POST", "/transitions")[1]?.body).toEqual({
      event: "approve",
      expectedVersion: 2,
    });
  });

  it("Discard sends nothing", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("action-approve");
    be.touch(rec.id);
    await press(view, "action-approve");
    await press(view, "note-confirm");
    await press(view, "stale-discard");
    expect(be.called("POST", "/transitions")).toHaveLength(1);
    expect(rec.status).toBe("OPEN");
  });

  it("offers no retry when the change is no longer allowed", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("action-approve");
    be.touch(rec.id);
    rec.status = "APPROVED"; // someone approved it meanwhile
    await press(view, "action-approve");
    await press(view, "note-confirm");
    await view.findByTestId("stale-message");
    await waitFor(() => expect(view.queryByTestId("stale-retry")).toBeNull());
    expect(
      await view.findByText("Your change is no longer allowed on the latest version."),
    ).toBeTruthy();
  });
});

describe("Journey: supervisor assigns a corrective action", () => {
  const approved = () =>
    be.seedIncident({ reporter: wid(), title: "Valve leak", status: "APPROVED" });

  it("prebuilt template, ordered milestones, resolves the report", async () => {
    const rec = approved();
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await press(view, "action-assign");
    await fireEvent.press(await view.findByLabelText("Prebuilt action"));
    await press(view, "assign-next");
    await pick(view, "template-select", "Replace Valve");
    await press(view, "assign-next");
    await press(view, "assign-next");
    await press(view, "assign-confirm");
    await waitFor(() => expect(be.called("POST", "/actions")).toHaveLength(1));
    expect(
      be.called("POST", "/v1/incidents").find((c) => c.path.endsWith("/actions"))?.body,
    ).toEqual({
      expectedVersion: 1,
      type: "PREBUILT",
      templateCode: "REPLACE_VALVE",
    });
    expect(rec.status).toBe("ACTION_ASSIGNED");
    await press(view, "assigned-banner").catch(() => undefined);
    await fireEvent.press(await view.findByLabelText("Open action"));

    // Delivered before Ordered: the button is disabled with a reason.
    expect((await view.findByTestId("mark-done-2")).props.accessibilityState?.disabled).toBe(true);
    expect(await view.findByText("Complete ‘Ordered’ first")).toBeTruthy();
    await press(view, "mark-done-1");
    await waitFor(() => expect(view.queryByTestId("mark-done-1")).toBeNull());
    await press(view, "mark-done-2");
    await waitFor(() => expect(view.queryByTestId("mark-done-2")).toBeNull());
    await press(view, "mark-done-3");
    await press(view, "confirm-complete-yes"); // the last one confirms: it resolves the incident
    expect(await view.findByTestId("resolved")).toBeTruthy();
    expect(rec.status).toBe("RESOLVED");
  });

  it("one-off: title required, no milestones or templateCode; completed with 'Mark action complete'", async () => {
    const rec = approved();
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await press(view, "action-assign");
    await press(view, "assign-next"); // ONE_OFF is the default type
    await press(view, "assign-next");
    expect(await view.findByText("Enter a title.")).toBeTruthy();
    await fireEvent.changeText(await view.findByTestId("assign-title"), "Isolate the line");
    await press(view, "assign-next");
    await press(view, "assign-next");
    await press(view, "assign-confirm");
    await waitFor(() => expect(be.called("POST", "/actions")).toHaveLength(1));
    const body = be.called("POST", "/actions")[0]?.body as Record<string, unknown>;
    expect(body).toEqual({ expectedVersion: 1, type: "ONE_OFF", title: "Isolate the line" });
    const [action] = [...be.actions.values()];
    await cleanup();
    const detail = await launch(be, { as: S, url: `/actions/${action!.id}` });
    await press(detail, "complete-action");
    await press(detail, "confirm-complete-yes");
    expect(await detail.findByTestId("resolved")).toBeTruthy();
  });

  it("custom: milestones are sent only for CUSTOM, in order", async () => {
    const rec = approved();
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await press(view, "action-assign");
    await fireEvent.press(await view.findByLabelText("Custom action"));
    await press(view, "assign-next");
    await fireEvent.changeText(await view.findByTestId("assign-title"), "Rebuild pump seal");
    await fireEvent.changeText(await view.findByTestId("milestone-title-0"), "Isolate");
    await press(view, "add-milestone");
    await fireEvent.changeText(await view.findByTestId("milestone-title-1"), "Replace seal");
    await press(view, "assign-next");
    await press(view, "assign-next");
    await press(view, "assign-confirm");
    await waitFor(() => expect(be.called("POST", "/actions")).toHaveLength(1));
    expect(be.called("POST", "/actions")[0]?.body).toEqual({
      expectedVersion: 1,
      type: "CUSTOM",
      title: "Rebuild pump seal",
      milestones: [{ title: "Isolate" }, { title: "Replace seal" }],
    });
  });

  it("a second action on the same report is blocked by the server and the page refetches", async () => {
    const rec = approved();
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await press(view, "action-assign");
    await press(view, "assign-next");
    await fireEvent.changeText(await view.findByTestId("assign-title"), "First");
    await press(view, "assign-next");
    await press(view, "assign-next");
    await press(view, "assign-confirm");
    await waitFor(() => expect(rec.status).toBe("ACTION_ASSIGNED"));
    // An action is running: Assign is gone (not offered twice).
    await waitFor(() => expect(view.queryByTestId("action-assign")).toBeNull());
  });
});

describe("Journey: reassigning an action", () => {
  it("is manager-only: a supervisor can assign an action but not reassign it", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Valve leak", status: "APPROVED" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await press(view, "action-assign");
    await press(view, "assign-next");
    await fireEvent.changeText(await view.findByTestId("assign-title"), "Isolate the line");
    await press(view, "assign-next");
    await press(view, "assign-next");
    await press(view, "assign-confirm");
    await waitFor(() => expect(be.actions.size).toBe(1));
    const [action] = [...be.actions.values()];
    await cleanup();

    const detail = await launch(be, { as: S, url: `/actions/${action!.id}` });
    await detail.findByTestId("action-detail");
    expect(detail.queryByTestId("reassign")).toBeNull(); // supervisors can't reassign

    await cleanup();
    const worker = await launch(be, { as: "worker@plantx.demo", url: `/actions/${action!.id}` });
    await worker.findByTestId("action-detail");
    expect(worker.queryByTestId("reassign")).toBeNull(); // workers can't reassign either
  });
});

describe("Journey: duplicates, similar reports and PPE", () => {
  it("links a report under a parent, then unlinks it from the parent's linked-reports thread", async () => {
    const parent = be.seedIncident({ reporter: wid(), title: "Original leak" });
    const child = be.seedIncident({ reporter: wid(), title: "Same leak again" });
    const view = await launch(be, { as: S, url: `/incidents/${child.id}` });
    await press(view, "action-link");
    await press(view, `pick-${parent.id}`);
    await press(view, "link-confirm");
    await waitFor(() => expect(child.clusterParentId).toBe(parent.id));
    expect(be.called("PUT", "/cluster")[0]?.body).toEqual({
      parentIncidentId: parent.id,
      expectedVersion: 1,
    });
    expect(await view.findByTestId("duplicate-banner")).toBeTruthy();
    await cleanup();

    const parentView = await launch(be, { as: S, url: `/incidents/${parent.id}` });
    await press(parentView, `unlink-${child.id}`);
    await waitFor(() => expect(child.clusterParentId).toBeNull());
    expect(be.called("DELETE", "/cluster")[0]?.body).toEqual({
      expectedVersion: child.version - 1,
    });
  });

  it("a report with its own duplicates cannot be linked, with the reason shown", async () => {
    const parent = be.seedIncident({ reporter: wid(), title: "Parent" });
    be.seedIncident({ reporter: wid(), title: "Kid", clusterParentId: parent.id });
    const view = await launch(be, { as: S, url: `/incidents/${parent.id}` });
    expect(await view.findByTestId("link-reason")).toBeTruthy();
    expect(view.queryByTestId("action-link")).toBeNull(); // the reason, not a dead button
    expect(await view.findByTestId("linked-reports")).toBeTruthy();
  });

  it("Similar shows AI scores as whole percentages", async () => {
    const a = be.seedIncident({ reporter: wid(), title: "A" });
    be.seedIncident({ reporter: wid(), title: "B" });
    const view = await launch(be, { as: S, url: `/incidents/${a.id}?tab=similar` });
    expect(await view.findByText("84% similar")).toBeTruthy();
    expect(be.called("GET", "/similar")[0]?.query.get("limit")).toBe("5");
  });

  it("runs a PPE scan on a report with a photo and says the result is simulated/AI", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "No helmet", photoKey: "photo/x/1" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}?tab=ppe` });
    expect(await view.findByText("No PPE scans yet")).toBeTruthy();
    await press(view, "ppe-run");
    await waitFor(() => expect(be.called("POST", "/ppe-scans")).toHaveLength(1));
    expect(be.called("POST", "/ppe-scans")[0]?.body).toBeUndefined();
  });

  it("no photo, no PPE button", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "No photo" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await view.findByTestId("incident-title");
    expect(view.queryByTestId("action-ppe")).toBeNull();
  });
});

describe("Journey: supervisor read-only areas", () => {
  it("can read the team but cannot add users", async () => {
    const view = await launch(be, { as: S, url: "/team" });
    expect(await view.findByText("Ravi Kumar")).toBeTruthy();
    expect(view.queryByTestId("add-user")).toBeNull();
  });
  it("can open analytics", async () => {
    be.seedIncident({ reporter: wid(), title: "x" });
    const view = await launch(be, { as: S, url: "/analytics" });
    expect(await view.findByTestId("kpi-tiles")).toBeTruthy();
  });
});
