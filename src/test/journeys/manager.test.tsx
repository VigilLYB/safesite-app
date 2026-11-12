import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { cleanup, fireEvent, launch, pathIs, press, tapMap, waitFor } from "../harness";

let be: FakeBackend;
const M = "manager@plantx.demo";
beforeEach(() => {
  be = createFakeBackend();
});
afterEach(cleanup);
const wid = () => be.userByEmail("worker@plantx.demo")!.id;

describe("Journey: manager analytics", () => {
  it("lands on the last 30 plant days with an exclusive end, never sending areaId", async () => {
    be.seedIncident({ reporter: wid(), title: "x" });
    const view = await launch(be, { as: M, url: "/" });
    await pathIs(view, "/analytics");
    expect(await view.findByTestId("kpi-tiles")).toBeTruthy();
    const call = be.called("GET", "/v1/analytics/summary")[0];
    expect(call?.query.get("from")).toMatch(/T18:30:00\.000Z$/);
    expect(call?.query.get("to")).toMatch(/T18:30:00\.000Z$/);
    expect(call?.query.has("areaId")).toBe(false);
  });

  it("filtering to shift C changes the request and the URL keeps it", async () => {
    be.seedIncident({ reporter: wid(), title: "x" });
    const view = await launch(be, { as: M, url: "/analytics" });
    await view.findByTestId("kpi-tiles");
    await fireEvent.press(await view.findByLabelText("Night 22:00–06:00"));
    await waitFor(() =>
      expect(be.called("GET", "/analytics/summary").some((c) => c.query.get("shift") === "C")).toBe(
        true,
      ),
    );
    expect(view.getSearchParams()).toMatchObject({ shift: "C" });
  });

  it("zero reports shows an empty state, not zeros", async () => {
    const view = await launch(be, { as: M, url: "/analytics" });
    expect(await view.findByText("No reports in this period")).toBeTruthy();
  });

  it("status counts link into the incidents list with the same range", async () => {
    be.seedIncident({ reporter: wid(), title: "Open one" });
    const view = await launch(be, { as: M, url: "/analytics" });
    await press(view, "bd-OPEN");
    await waitFor(() => expect(view.getPathname()).toBe("/incidents"));
    expect(view.getSearchParams()).toMatchObject({ tab: "triage" });
  });

  it("heatmap needs a blueprint, lists zero-report areas, and 'View reports' filters by area", async () => {
    be.seedIncident({ reporter: wid(), title: "Pinned" });
    const view = await launch(be, { as: M, url: "/analytics/heatmap" });
    await view.findByTestId("area-table");
    const call = be.called("GET", "/analytics/heatmap")[0];
    expect(call?.query.get("blueprintId")).toBe("b0000000-0000-4000-8000-000000000001");
    expect(call?.query.get("cellSize")).toBe("50");
    expect(await view.findByText("Empty Bay")).toBeTruthy(); // zero-report area still listed
    await press(view, "area-a0000000-0000-4000-8000-000000000001");
    await press(view, "view-area-reports");
    await waitFor(() => expect(view.getPathname()).toBe("/incidents"));
    expect(view.getSearchParams()).toMatchObject({
      areaId: "a0000000-0000-4000-8000-000000000001",
      tab: "all",
    });
  });

  it("draws a smooth heat layer with a colour-scale legend, and the metric can be switched", async () => {
    be.seedIncident({ reporter: wid(), title: "Pinned" });
    const view = await launch(be, { as: M, url: "/analytics/heatmap" });
    await view.findByTestId("area-table");
    await fireEvent(await view.findByTestId("blueprint-canvas"), "layout", {
      nativeEvent: { layout: { width: 500, height: 400 } },
    });
    expect(await view.findByTestId("heat-layer")).toBeTruthy();
    expect(await view.findByTestId("heat-legend")).toBeTruthy();
    expect(await view.findByText("Highest risk")).toBeTruthy();
    await fireEvent.press(await view.findByLabelText("Report count"));
    expect(await view.findByText("Most reports")).toBeTruthy();
    expect(view.getByTestId("heat-layer")).toBeTruthy();
  });

  it("an invalid cell size is rejected client-side", async () => {
    const view = await launch(be, { as: M, url: "/analytics/heatmap" });
    await view.findByTestId("cell-size");
    await fireEvent.changeText(await view.findByTestId("cell-size"), "5");
    expect(await view.findByText("Enter a whole number from 10 to 500.")).toBeTruthy();
    expect(
      be.called("GET", "/analytics/heatmap").some((c) => c.query.get("cellSize") === "5"),
    ).toBe(false);
  });
});

describe("Journey: manager closes and reopens", () => {
  it("lands on Awaiting closure; close needs no reason, reopen needs one", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Fixed valve", status: "RESOLVED" });
    const view = await launch(be, { as: M, url: "/incidents" });
    expect(await view.findByText("Fixed valve")).toBeTruthy();
    expect(
      be
        .called("GET", "/v1/incidents")
        .find((c) => c.path === "/v1/incidents")
        ?.query.get("status"),
    ).toBe("RESOLVED");
    await fireEvent.press(await view.findByTestId(`incident-${rec.id}`));
    await press(view, "action-close");
    expect((await view.findByTestId("note-confirm")).props.accessibilityState?.disabled).toBe(
      false,
    );
    await press(view, "note-confirm");
    await waitFor(() => expect(rec.status).toBe("CLOSED"));
    await waitFor(() => expect(view.queryByTestId("note-confirm")).toBeNull());
    await waitFor(() => expect(view.queryByTestId("action-close")).toBeNull());

    await press(view, "action-reopen");
    expect((await view.findByTestId("note-confirm")).props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(await view.findByTestId("note-input"), "Leak returned");
    await press(view, "note-confirm");
    await waitFor(() => expect(rec.status).toBe("OPEN"));
    expect(be.called("POST", "/transitions").at(-1)?.body).toEqual({
      event: "reopen",
      expectedVersion: 2,
      note: "Leak returned",
    });
    expect(rec.nodes.at(-1)?.label).toBe("Reopened");
  });

  it("a rejected report can be reopened by the manager", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Dismissed", status: "REJECTED" });
    const view = await launch(be, { as: M, url: `/incidents/${rec.id}` });
    expect(await view.findByTestId("action-reopen")).toBeTruthy();
    expect(view.queryByTestId("action-close")).toBeNull();
  });

  it("history shows the reject/reopen reason", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Dismissed" });
    rec.status = "REJECTED";
    rec.nodes.push({
      version: 2,
      versionId: "v2",
      nodeType: "REJECTED",
      label: "Rejected",
      actorId: null,
      actorRole: "SUPERVISOR",
      note: "Duplicate of #12",
      status: "REJECTED",
      changedFields: ["status"],
      createdAt: "2026-11-12T11:00:00Z",
    });
    rec.version = 2;
    const view = await launch(be, { as: M, url: `/incidents/${rec.id}?tab=history` });
    expect(await view.findByText("Reason: Duplicate of #12")).toBeTruthy();
  });
});

describe("Journey: manager administers people and plans", () => {
  it("adds a user once; the same email again says it is in use", async () => {
    const view = await launch(be, { as: M, url: "/team" });
    await press(view, "add-user");
    await fireEvent.changeText(await view.findByTestId("user-email"), "NEW.Hire@PlantX.demo");
    await fireEvent.changeText(await view.findByTestId("user-name"), "New Hire");
    await press(view, "user-generate");
    await press(view, "user-submit");
    expect(await view.findByTestId("temp-password")).toBeTruthy();
    expect(be.called("POST", "/v1/users")[0]?.body).toMatchObject({
      email: "new.hire@plantx.demo",
      fullName: "New Hire",
      role: "WORKER",
    });
    expect(
      String((be.called("POST", "/v1/users")[0]?.body as { password: string }).password).length,
    ).toBeGreaterThanOrEqual(10);
    await press(view, "user-done");
    expect(await view.findByText("New Hire")).toBeTruthy();

    await press(view, "add-user");
    await fireEvent.changeText(await view.findByTestId("user-email"), "new.hire@plantx.demo");
    await fireEvent.changeText(await view.findByTestId("user-name"), "Again");
    await press(view, "user-generate");
    await press(view, "user-submit");
    expect(await view.findByText("This email is already in use")).toBeTruthy();
  });

  it("rejects a short temporary password before sending", async () => {
    const view = await launch(be, { as: M, url: "/team" });
    await press(view, "add-user");
    await fireEvent.changeText(await view.findByTestId("user-email"), "a@b.co");
    await fireEvent.changeText(await view.findByTestId("user-name"), "A");
    await fireEvent.changeText(await view.findByTestId("user-password"), "short");
    await press(view, "user-submit");
    expect(await view.findByText("Use at least 10 characters.")).toBeTruthy();
    expect(be.called("POST", "/v1/users")).toHaveLength(0);
  });

  it("lists blueprints and draws a named area inside the plan", async () => {
    const view = await launch(be, { as: M, url: "/admin/blueprints" });
    expect(await view.findByText("Plant X")).toBeTruthy();
    await fireEvent.press(await view.findByLabelText("Open Plant X"));
    await press(view, "add-area");
    await fireEvent.changeText(await view.findByTestId("area-name"), "Loading Dock");
    await tapMap(view, 600, 100);
    await tapMap(view, 900, 100);
    await tapMap(view, 900, 5000); // off the plan: clamped to 800
    await press(view, "save-area");
    await waitFor(() => expect(be.called("POST", "/areas")).toHaveLength(1));
    expect(be.called("POST", "/areas")[0]?.body).toEqual({
      name: "Loading Dock",
      polygon: [
        [600, 100],
        [900, 100],
        [900, 800],
      ],
    });
  });

  it("an area needs 3 corners and a name; a taken name shows 409 on the field", async () => {
    const view = await launch(be, {
      as: M,
      url: `/admin/blueprints/b0000000-0000-4000-8000-000000000001`,
    });
    await press(view, "add-area");
    await fireEvent.changeText(await view.findByTestId("area-name"), "Pump Room");
    await tapMap(view, 600, 100);
    expect((await view.findByTestId("save-area")).props.accessibilityState?.disabled).toBe(true);
    await tapMap(view, 900, 100);
    await tapMap(view, 900, 300);
    await press(view, "save-area");
    expect(await view.findByText("Area name already used on this blueprint")).toBeTruthy();
  });
});
