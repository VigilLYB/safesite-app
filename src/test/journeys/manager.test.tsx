import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { within } from "@testing-library/react-native";
import {
  CAMERA_PATH,
  PLUS_PATH,
  cleanup,
  fireEvent,
  iconPaths,
  launch,
  pathIs,
  press,
  tapMap,
  waitFor,
} from "../harness";

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
    expect(view.queryByTestId("analytics-filter-panel")).toBeNull(); // options start hidden
    await fireEvent.press(await view.findByTestId("toggle-analytics-filters"));
    await fireEvent.press(await view.findByTestId("an-shift"));
    await fireEvent.press(await view.findByText("Night"));
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

describe("Journey: manager phone bar and the header Report button", () => {
  const phone = (url = "/incidents?tab=closure") => launch(be, { as: M, url, phone: true });

  it("the bar is Incidents, Actions, [Analytics], Alerts, Account; Report is not a tab", async () => {
    const view = await phone();
    await view.findByTestId("incidents-screen");
    for (const key of ["incidents", "actions", "analytics", "alerts", "account"]) {
      expect(await view.findByTestId(`tab-${key}`)).toBeTruthy();
    }
    expect(view.queryByTestId("tab-report")).toBeNull();
    // Analytics is an ordinary tab like the rest: no raised circle of any kind in the bar.
    expect(view.queryByTestId("primary-fab")).toBeNull();
    expect(view.queryByTestId("report-fab")).toBeNull();
  });

  it("there is no Analytics button at the top right of the incidents page any more", async () => {
    const view = await phone();
    await view.findByTestId("incidents-screen");
    expect(view.queryByTestId("open-analytics")).toBeNull();
  });

  it("the Analytics tab opens Overview, with Heatmap and Trends one tap away", async () => {
    be.seedIncident({ reporter: wid(), title: "Resolved one", status: "RESOLVED" });
    const view = await phone();
    await view.findByTestId("incidents-screen");
    await press(view, "tab-analytics");
    await pathIs(view, "/analytics");
    expect(await view.findByTestId("kpi-tiles")).toBeTruthy();
    for (const tab of ["Overview", "Heatmap", "Trends"]) {
      expect(await view.findByLabelText(tab)).toBeTruthy();
    }
    await fireEvent.press(await view.findByLabelText("Heatmap"));
    await waitFor(() => expect(view.getSearchParams()).toMatchObject({ view: "heatmap" }));
    expect(view.getPathname()).toBe("/analytics"); // same screen, not a new page
    await fireEvent.press(await view.findByLabelText("Trends"));
    await waitFor(() => expect(view.getSearchParams()).toMatchObject({ view: "trends" }));
    expect(await view.findByTestId("trends-screen")).toBeTruthy();
  });

  it("Report is a button at the top right of the page header and opens the report page", async () => {
    const view = await phone();
    await view.findByTestId("incidents-screen");
    await press(view, "report-header-button");
    await pathIs(view, "/report");
    expect(await view.findByTestId("report-screen")).toBeTruthy();
    // No button on the page it opens.
    expect(view.queryByTestId("report-header-button")).toBeNull();
  });

  it("there is no floating Report button any more", async () => {
    const view = await phone();
    await view.findByTestId("incidents-screen");
    expect(view.queryByTestId("report-fab-float")).toBeNull();
    expect(view.queryByTestId("report-fab")).toBeNull();
  });

  it("Report uses a camera icon, not a plus", async () => {
    const view = await phone();
    await view.findByTestId("report-header-button");
    const drawn = iconPaths(view, "report-header-button");
    expect(drawn.some((d) => d.startsWith(CAMERA_PATH))).toBe(true);
    expect(drawn).not.toContain(PLUS_PATH);
  });

  it.each([
    ["/incidents?tab=closure", "incidents-screen"],
    ["/actions", "actions-screen"],
    ["/analytics", "analytics-screen"],
    ["/alerts", "alerts-screen"],
    ["/account", "account-screen"],
    ["/team", "team-screen"],
    ["/admin/blueprints", "blueprints-screen"],
    ["/admin/blueprints/new", "new-blueprint-screen"],
  ])("every manager page has the Report button: %s", async (url, screen) => {
    const view = await launch(be, { as: M, url, phone: true });
    await view.findByTestId(screen);
    expect(await view.findByTestId("report-header-button")).toBeTruthy();
    expect(view.getAllByTestId("report-header-button")).toHaveLength(1);
  });

  it("detail pages have it too (a report, an action)", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Hot machine" });
    const view = await launch(be, { as: M, url: `/incidents/${rec.id}`, phone: true });
    await view.findByTestId("incident-detail");
    expect(await view.findByTestId("report-header-button")).toBeTruthy();
  });

  it("the button sits on the title's own line, level with the heading", async () => {
    const view = await phone("/alerts");
    const actions = await view.findByTestId("header-actions");
    const titleRow = actions.parent!;
    // The same row holds the page title, so the button is aligned with the heading, not above it.
    expect(within(titleRow).getByRole("header")).toBeTruthy();
    expect(within(titleRow).getByTestId("report-header-button")).toBeTruthy();
  });

  it("it shares the row with a page's own actions, which stay to its left", async () => {
    be.seedIncident({ reporter: wid(), title: "Needs attention" });
    const view = await phone("/alerts");
    await view.findByTestId("mark-all-read");
    const actions = await view.findByTestId("header-actions");
    expect(within(actions).getByTestId("mark-all-read")).toBeTruthy();
    expect(within(actions).getByTestId("report-header-button")).toBeTruthy();
  });

  it("the wide layout has the button on every page too", async () => {
    const view = await launch(be, { as: M, url: "/incidents" });
    await view.findByTestId("incidents-screen");
    expect(await view.findByTestId("report-header-button")).toBeTruthy();
    await cleanup();
    const analytics = await launch(be, { as: M, url: "/analytics" });
    await analytics.findByTestId("analytics-screen");
    expect(await analytics.findByTestId("report-header-button")).toBeTruthy();
  });

  it("workers and supervisors keep Report in the middle and get no header button", async () => {
    const sup = await launch(be, { as: "supervisor@plantx.demo", url: "/incidents", phone: true });
    await sup.findByTestId("incidents-screen");
    expect(sup.queryByTestId("report-header-button")).toBeNull();
    expect(await sup.findByTestId("report-fab")).toBeTruthy();
    await cleanup();
    const worker = await launch(be, { as: "worker@plantx.demo", url: "/incidents", phone: true });
    await worker.findByTestId("incidents-screen");
    expect(worker.queryByTestId("report-header-button")).toBeNull();
    expect(await worker.findByTestId("report-fab")).toBeTruthy();
  });
});

describe("Journey: switching Analytics tabs only reloads the content", () => {
  it("the header, tab strip and filters stay mounted; only the content below changes", async () => {
    be.seedIncident({ reporter: wid(), title: "Pinned" });
    const view = await launch(be, { as: M, url: "/analytics" });
    await view.findByTestId("kpi-tiles");
    // Grab the elements that must survive a tab switch. A remount would create new ones.
    const strip = view.getByTestId("tab-heatmap");
    const filters = view.getByTestId("analytics-filters");
    const screen = view.getByTestId("analytics-screen");

    await fireEvent.press(strip);
    await view.findByTestId("area-table");
    expect(view.getByTestId("tab-heatmap")).toBe(strip);
    expect(view.getByTestId("analytics-filters")).toBe(filters);
    expect(view.getByTestId("analytics-screen")).toBe(screen);
    expect(view.queryByTestId("kpi-tiles")).toBeNull(); // the overview content is gone

    await fireEvent.press(view.getByTestId("tab-trends"));
    await view.findByTestId("by-week");
    expect(view.getByTestId("tab-heatmap")).toBe(strip);
    expect(view.getByTestId("analytics-filters")).toBe(filters);
    expect(view.queryByTestId("area-table")).toBeNull();

    await fireEvent.press(view.getByTestId("tab-overview"));
    await view.findByTestId("kpi-tiles");
    expect(view.getByTestId("tab-heatmap")).toBe(strip);
  });

  it("only the chosen view fetches: the heatmap tab does not refetch the overview", async () => {
    be.seedIncident({ reporter: wid(), title: "Pinned" });
    const view = await launch(be, { as: M, url: "/analytics" });
    await view.findByTestId("kpi-tiles");
    const summaries = be.called("GET", "/analytics/summary").length;
    expect(be.called("GET", "/analytics/heatmap")).toHaveLength(0); // not asked for yet
    await fireEvent.press(await view.findByTestId("tab-heatmap"));
    await view.findByTestId("area-table");
    expect(be.called("GET", "/analytics/heatmap").length).toBeGreaterThan(0);
    expect(be.called("GET", "/analytics/summary")).toHaveLength(summaries); // overview untouched
    // Coming back reuses the cached overview instead of loading it again.
    await fireEvent.press(await view.findByTestId("tab-overview"));
    await view.findByTestId("kpi-tiles");
    expect(be.called("GET", "/analytics/summary")).toHaveLength(summaries);
  });

  it("filters carry over between tabs", async () => {
    be.seedIncident({ reporter: wid(), title: "Pinned" });
    const view = await launch(be, { as: M, url: "/analytics?severity=HIGH" });
    await view.findByTestId("kpi-tiles");
    await fireEvent.press(await view.findByTestId("tab-trends"));
    await view.findByTestId("by-week");
    expect(
      be.called("GET", "/analytics/trends").every((c) => c.query.get("severity") === "HIGH"),
    ).toBe(true);
  });

  it("old deep links still work: /analytics/heatmap lands on the Heatmap view", async () => {
    const view = await launch(be, { as: M, url: "/analytics/heatmap?shift=C" });
    await view.findByTestId("area-table");
    expect(view.getPathname()).toBe("/analytics");
    expect(view.getSearchParams()).toMatchObject({ view: "heatmap", shift: "C" });
    expect(be.called("GET", "/analytics/heatmap")[0]?.query.get("shift")).toBe("C");
  });

  it("an unknown view falls back to Overview", async () => {
    be.seedIncident({ reporter: wid(), title: "Pinned" });
    const view = await launch(be, { as: M, url: "/analytics?view=bogus" });
    expect(await view.findByTestId("kpi-tiles")).toBeTruthy();
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

describe("Journey: reassigning an action", () => {
  const labels = (rec: { nodes: { label: string }[] }) => rec.nodes.map((n) => n.label);

  it("a manager changes the assignee from the action page; the report's history records it", async () => {
    const rec = be.seedIncident({ reporter: wid(), title: "Valve leak", status: "APPROVED" });
    const view = await launch(be, { as: M, url: `/incidents/${rec.id}` });
    await press(view, "action-assign");
    await press(view, "assign-next");
    await fireEvent.changeText(await view.findByTestId("assign-title"), "Isolate the line");
    await press(view, "assign-next");
    await press(view, "assign-next");
    await press(view, "assign-confirm");
    await waitFor(() => expect(be.actions.size).toBe(1));
    const [action] = [...be.actions.values()];
    await cleanup();

    const detail = await launch(be, { as: M, url: `/actions/${action!.id}` });
    await press(detail, "reassign-picker");
    await fireEvent.press(await detail.findByText("Sana Shaikh"));
    await waitFor(() => expect(be.called("PUT", "/assignee")).toHaveLength(1));
    const sana = be.userByEmail("contractor@plantx.demo")!.id;
    expect(be.called("PUT", "/assignee")[0]?.body).toEqual({ assigneeId: sana });
    expect(action!.assigneeId).toBe(sana);
    expect(labels(rec).at(-1)).toBe("Reassigned Action");
    expect(await detail.findByLabelText("Assignee: Sana Shaikh")).toBeTruthy();
  });
});
