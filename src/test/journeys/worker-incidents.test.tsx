import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { cleanup, fireEvent, launch, press, tapMap, waitFor } from "../harness";

let be: FakeBackend;
const W = "worker@plantx.demo";
beforeEach(() => {
  be = createFakeBackend();
});
afterEach(cleanup);
const wid = () => be.userByEmail(W)!.id;
const other = () => be.userByEmail("contractor@plantx.demo")!.id;

describe("Journey: worker sees only their own reports", () => {
  it("lists own reports, never another worker's, and sends no staff-only filters", async () => {
    const mine = be.seedIncident({ reporter: wid(), title: "My leak" });
    const theirs = be.seedIncident({ reporter: other(), title: "Their spill" });
    const view = await launch(be, { as: W, url: "/incidents" });
    expect(await view.findByTestId(`incident-${mine.id}`)).toBeTruthy();
    expect(view.queryByTestId(`incident-${theirs.id}`)).toBeNull();
    const call = be.called("GET", "/v1/incidents").find((c) => c.path === "/v1/incidents");
    expect(call?.query.get("status")).toBe("OPEN,VALIDATED,APPROVED,ACTION_ASSIGNED");
    for (const k of ["reporterId", "rootsOnly", "mine", "areaId", "blueprintId"])
      expect(call?.query.has(k)).toBe(false);
    expect(call?.query.get("limit")).toBe("25");
  });

  it("tabs map to server-side status filters", async () => {
    be.seedIncident({ reporter: wid(), title: "Done one", status: "CLOSED" });
    const view = await launch(be, { as: W, url: "/incidents" });
    await view.findByTestId("incidents-screen");
    await press(view, "tab-resolved");
    await waitFor(() =>
      expect(
        be.called("GET", "/v1/incidents").some((c) => c.query.get("status") === "RESOLVED,CLOSED"),
      ).toBe(true),
    );
    expect(await view.findByText("Done one")).toBeTruthy();
    await press(view, "tab-rejected");
    expect(await view.findByText("No reports here")).toBeTruthy();
  });

  it("empty state invites a first report", async () => {
    const view = await launch(be, { as: W, url: "/incidents" });
    expect(await view.findByText("You haven't reported anything yet")).toBeTruthy();
  });

  it("another worker's report id shows 'not found or not shared', not 'no access'", async () => {
    const theirs = be.seedIncident({ reporter: other(), title: "Their spill" });
    const view = await launch(be, { as: W, url: `/incidents/${theirs.id}` });
    expect(await view.findByTestId("record-not-found")).toBeTruthy();
    expect(view.queryByText(/don't have access/i)).toBeNull();
  });

  it("a malformed id never reaches the network", async () => {
    const view = await launch(be, { as: W, url: "/incidents/not-a-uuid" });
    expect(await view.findByTestId("record-not-found")).toBeTruthy();
    expect(be.calls.filter((c) => c.path.includes("not-a-uuid"))).toHaveLength(0);
  });

  it("load more fetches the next cursor page and de-duplicates", async () => {
    for (let i = 0; i < 30; i++) be.seedIncident({ reporter: wid(), title: `Report ${i}` });
    const view = await launch(be, { as: W, url: "/incidents" });
    await press(view, "load-more");
    await waitFor(() =>
      expect(be.called("GET", "/v1/incidents").some((c) => c.query.get("cursor") === "25")).toBe(
        true,
      ),
    );
    await waitFor(() => expect(view.queryByTestId("load-more")).toBeNull());
  });
});

describe("Journey: worker edits their own report", () => {
  it("edit sends only what changed + expectedVersion, and the timeline gains a node", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak", severity: "LOW" });
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}` });
    await press(view, "action-edit");
    expect((await view.findByTestId("edit-save")).props.accessibilityState?.disabled).toBe(true); // nothing changed
    await press(view, "edit-save").catch(() => undefined);
    expect(be.called("PATCH", "/v1/incidents")).toHaveLength(0);
    await fireEvent.changeText(await view.findByTestId("edit-title"), "Big leak");
    await fireEvent.changeText(await view.findByTestId("edit-note"), "More water than I thought");
    await press(view, "edit-save");
    await waitFor(() => expect(be.called("PATCH", "/v1/incidents")).toHaveLength(1));
    expect(be.called("PATCH", "/v1/incidents")[0]?.body).toEqual({
      expectedVersion: 1,
      title: "Big leak",
      note: "More water than I thought",
    });
    expect(be.incidents.get(rec.id)?.nodes.map((n) => n.label)).toContain("Worker Edited");
    expect(await view.findByText("Big leak")).toBeTruthy();
  });

  it("clearing the title sends null (clear), not an empty string", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak", description: "wet floor" });
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}` });
    await press(view, "action-edit");
    await fireEvent.changeText(await view.findByTestId("edit-title"), "");
    await press(view, "edit-save");
    await waitFor(() => expect(be.called("PATCH", "/v1/incidents")).toHaveLength(1));
    expect((be.called("PATCH", "/v1/incidents")[0]?.body as { title: unknown }).title).toBeNull();
  });

  it("after approval the worker has no Edit and no workflow buttons", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak", status: "APPROVED" });
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}` });
    await view.findByTestId("incident-title");
    for (const id of [
      "action-edit",
      "action-validate",
      "action-approve",
      "action-reject",
      "action-assign",
      "action-close",
      "action-reopen",
      "action-link",
    ]) {
      expect(view.queryByTestId(id)).toBeNull();
    }
    expect(view.queryByText("Similar")).toBeNull(); // AI similar tab is staff-only
  });

  it("moves the pin from the Location tab (clamped to the plan) and the timeline records it", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}?tab=location` });
    await press(view, "move-pin");
    await tapMap(view, 640, 480);
    await press(view, "save-location");
    await waitFor(() => expect(be.called("PUT", "/location")).toHaveLength(1));
    expect(be.called("PUT", "/location")[0]?.body).toEqual({
      expectedVersion: 1,
      blueprintId: "b0000000-0000-4000-8000-000000000001",
      x: 640,
      y: 480,
    });
    expect(be.incidents.get(rec.id)?.nodes.map((n) => n.label)).toContain("Worker Moved Pin");
  });

  it("history lists every node and each opens a read-only past version", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    be.touch(rec.id);
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}?tab=history` });
    await view.findByTestId("history-1");
    await view.findByTestId("history-2");
    const buttons = await view.findAllByLabelText("View this version");
    await fireEvent.press(buttons[0]!);
    expect(await view.findByTestId("version-banner")).toBeTruthy();
    expect(view.queryByTestId("action-edit")).toBeNull();
    expect(view.queryByTestId("action-approve")).toBeNull();
  });

  it("a version that doesn't exist shows not-found with a way back", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Leak" });
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}/versions/9` });
    expect(await view.findByTestId("record-not-found")).toBeTruthy();
  });
});

describe("Journey: worker and actions", () => {
  const ACTION_ID = "00000000-0000-4000-8000-0000000000a1";
  const MS_ID = "00000000-0000-4000-8000-0000000000b1";
  const seedAction = (assigneeId: string) => {
    const rec = be.seedIncident({ reporter: other(), title: "Valve", status: "ACTION_ASSIGNED" });
    be.actions.set(ACTION_ID, {
      id: ACTION_ID,
      incidentId: rec.id,
      type: "PREBUILT",
      templateCode: "REPLACE_VALVE",
      title: "Replace valve",
      description: null,
      status: "OPEN",
      assigneeId,
      assignedBy: be.userByEmail("supervisor@plantx.demo")!.id,
      dueAt: "2026-11-20T00:00:00Z",
      completedAt: null,
      createdAt: "2026-11-12T10:00:00Z",
      milestones: [
        { id: MS_ID, seq: 1, title: "Ordered", dueAt: null, completedAt: null, completedBy: null },
      ],
    });
  };

  it("a worker who isn't the assignee sees the action read-only", async () => {
    seedAction(other());
    const view = await launch(be, { as: W, url: `/actions/${ACTION_ID}` });
    expect(
      await view.findByText("Only the assignee or a supervisor can update this action."),
    ).toBeTruthy();
    expect(view.queryByTestId("mark-done-1")).toBeNull();
    expect(be.called("POST", "/complete")).toHaveLength(0);
  });

  it("the assignee can complete the milestone, which resolves the report", async () => {
    seedAction(wid());
    const view = await launch(be, { as: W, url: `/actions/${ACTION_ID}` });
    await press(view, "mark-done-1");
    await press(view, "confirm-complete-yes");
    await waitFor(() => expect(be.called("POST", `/milestones/${MS_ID}/complete`)).toHaveLength(1));
    expect(be.called("POST", "/complete")[0]?.body).toBeUndefined(); // no body
    expect(await view.findByTestId("resolved")).toBeTruthy();
  });

  it("'Assigned to me' is the default tab and workers get no assignee filter", async () => {
    seedAction(other());
    const view = await launch(be, { as: W, url: "/actions" });
    expect(await view.findByText("Nothing assigned to you")).toBeTruthy();
    expect(be.called("GET", "/v1/actions").some((c) => c.query.get("mine") === "true")).toBe(true);
    expect(be.called("GET", "/v1/users")).toHaveLength(0);
    await press(view, "tab-active");
    expect(await view.findByText("Replace valve")).toBeTruthy();
  });
});
