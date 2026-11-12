import { within } from "@testing-library/react-native";
import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { cleanup, fireEvent, launch, pathIs, press, waitFor, type View } from "../harness";

let be: FakeBackend;
const W = "worker@plantx.demo";
beforeEach(() => {
  be = createFakeBackend();
});
afterEach(cleanup);
const wid = () => be.userByEmail("worker@plantx.demo")!.id;
const other = () => be.userByEmail("contractor@plantx.demo")!.id;
const ACTION_ID = "00000000-0000-4000-8000-0000000000a1";

const seedAssignedAction = (assignee: string, overdue = false) => {
  const rec = be.seedIncident({ reporter: other(), title: "Valve", status: "ACTION_ASSIGNED" });
  be.actions.set(ACTION_ID, {
    id: ACTION_ID,
    incidentId: rec.id,
    type: "PREBUILT",
    templateCode: "REPLACE_VALVE",
    title: "Replace valve",
    description: null,
    status: "OPEN",
    assigneeId: assignee,
    assignedBy: be.userByEmail("supervisor@plantx.demo")!.id,
    dueAt: overdue ? "2020-01-01T00:00:00Z" : "2026-11-20T00:00:00Z",
    completedAt: null,
    createdAt: "2026-11-12T10:00:00Z",
    milestones: [
      {
        id: "00000000-0000-4000-8000-0000000000b1",
        seq: 1,
        title: "Ordered",
        dueAt: null,
        completedAt: null,
        completedBy: null,
      },
    ],
  });
};
const phone = (as: string, url = "/incidents") => launch(be, { as, url, phone: true });
const badge = (view: View) => view.queryByTestId("tab-badge");

describe("Journey: five-tab phone bar with a raised Report button", () => {
  it.each(["worker", "supervisor", "manager"])(
    "%s sees My reports/Incidents, Actions, Report, Alerts, Account",
    async (who) => {
      const view = await phone(`${who}@plantx.demo`);
      await view.findByTestId("incidents-screen");
      for (const key of ["incidents", "actions", "report", "alerts", "account"]) {
        expect(await view.findByTestId(`tab-${key}`)).toBeTruthy();
      }
      // Web-only sections are not in the phone bar.
      for (const key of ["analytics", "team", "blueprints"])
        expect(view.queryByTestId(`tab-${key}`)).toBeNull();
    },
  );

  it("Report is drawn as the raised circle in the middle and opens the report page", async () => {
    const view = await phone(W);
    await view.findByTestId("incidents-screen");
    const fab = await view.findByTestId("report-fab");
    expect(fab).toBeTruthy();
    // It is the third of five: My reports, Actions, [Report], Alerts, Account.
    const order = ["incidents", "actions", "report", "alerts", "account"];
    const present = order.filter((key) => view.queryByTestId(`tab-${key}`));
    expect(present).toEqual(order);
    expect(view.getAllByTestId("report-fab")).toHaveLength(1); // only Report gets the circle
    // The caption under the circle is just "Report"; the full name stays for screen readers.
    const tab = view.getByTestId("tab-report");
    expect(within(tab).queryByText("Report a hazard")).toBeNull();
    // No "Report a hazard" button at the top of the page any more: the circle is the way in.
    expect(view.queryByTestId("report-hazard")).toBeNull();
    expect(view.queryByText("Report a hazard")).toBeNull();
    expect(within(tab).getByText("Report")).toBeTruthy();
    expect(tab.props.accessibilityLabel).toBe("Report a hazard");
    await fireEvent.press(await view.findByTestId("tab-report"));
    await pathIs(view, "/report");
    expect(await view.findByTestId("report-screen")).toBeTruthy();
  });

  it("the tablet / web sidebar has no raised circle", async () => {
    const view = await launch(be, { as: W, url: "/incidents" });
    await view.findByTestId("incidents-screen");
    expect(view.queryByTestId("report-fab")).toBeNull();
  });
});

describe("Journey: alerts for a worker", () => {
  it("an assigned action and a supervisor's change show a badge, then the list", async () => {
    seedAssignedAction(wid());
    const mine = be.seedIncident({ reporter: wid(), title: "Hot machine" });
    be.touch(mine.id); // a supervisor modified it
    const view = await phone(W);
    await waitFor(() => expect(badge(view)).not.toBeNull());
    expect(await view.findByLabelText("Alerts, 2 unread")).toBeTruthy();

    await fireEvent.press(await view.findByTestId("tab-alerts"));
    expect(await view.findByTestId("alerts-screen")).toBeTruthy();
    expect(await view.findByText("Action assigned to you")).toBeTruthy();
    expect(await view.findByText("Supervisor Modified")).toBeTruthy();
    expect((await view.findAllByText("New")).length).toBe(2);
  });

  it("leaving the Alerts screen marks them read and clears the badge", async () => {
    seedAssignedAction(wid());
    const view = await phone(W);
    await waitFor(() => expect(badge(view)).not.toBeNull());
    await fireEvent.press(await view.findByTestId("tab-alerts"));
    await view.findByText("Action assigned to you");
    await fireEvent.press(await view.findByTestId("tab-incidents"));
    await waitFor(() => expect(badge(view)).toBeNull());
    // Coming back, the alert is still listed but no longer marked New.
    await fireEvent.press(await view.findByTestId("tab-alerts"));
    await view.findByText("Action assigned to you");
    expect(view.queryByText("New")).toBeNull();
  });

  it("'Mark all read' clears the badge without leaving", async () => {
    seedAssignedAction(wid());
    const view = await phone(W, "/alerts");
    await press(view, "mark-all-read");
    await waitFor(() => expect(badge(view)).toBeNull());
    expect(view.queryByTestId("mark-all-read")).toBeNull();
  });

  it("an overdue action raises a second, overdue alert", async () => {
    seedAssignedAction(wid(), true);
    const view = await phone(W, "/alerts");
    expect(await view.findByText("Action overdue")).toBeTruthy();
    expect(await view.findByText("Action assigned to you")).toBeTruthy();
  });

  it("tapping an alert opens what it is about", async () => {
    seedAssignedAction(wid());
    const view = await phone(W, "/alerts");
    await fireEvent.press(await view.findByTestId(`alert-action-assigned:${ACTION_ID}`));
    await pathIs(view, `/actions/${ACTION_ID}`);
  });

  it("the worker's own edits and other people's work are not alerts; empty state says so", async () => {
    seedAssignedAction(other()); // assigned to someone else
    be.seedIncident({ reporter: wid(), title: "Untouched" }); // never changed
    const view = await phone(W, "/alerts");
    expect(await view.findByText("You're all caught up")).toBeTruthy();
    expect(badge(view)).toBeNull();
  });

  it("a failed refresh shows an error with retry, not a blank screen", async () => {
    be.flags.failNext.push({ match: /GET \/v1\/incidents$/, status: 500 });
    be.flags.failNext.push({ match: /GET \/v1\/incidents$/, status: 500 });
    const view = await phone(W, "/alerts");
    expect(await view.findByText("Something went wrong", {}, { timeout: 6000 })).toBeTruthy();
  });
});

describe("Journey: alerts for staff", () => {
  it("a supervisor is told about reports waiting for triage and overdue actions", async () => {
    be.seedIncident({ reporter: wid(), title: "Fresh leak" });
    seedAssignedAction(wid(), true);
    const view = await phone("supervisor@plantx.demo", "/alerts");
    expect(await view.findByText("Report waiting for triage")).toBeTruthy();
    expect(await view.findByText("Action overdue")).toBeTruthy();
    expect(view.queryByText("Ready to close")).toBeNull(); // managers only
    expect(
      be
        .called("GET", "/v1/incidents")
        .some((c) => c.query.get("status") === "OPEN" && c.query.get("rootsOnly") === "true"),
    ).toBe(true);
  });

  it("a supervisor is not told a resolved report is ready to close (managers only)", async () => {
    be.seedIncident({ reporter: wid(), title: "Fixed valve", status: "RESOLVED" });
    be.seedIncident({ reporter: wid(), title: "Marker" }); // proves the feed loaded
    const view = await phone("supervisor@plantx.demo", "/alerts");
    await view.findByText("Report waiting for triage");
    expect(view.queryByText("Ready to close")).toBeNull();
    expect(
      be.called("GET", "/v1/incidents").some((c) => c.query.get("status") === "RESOLVED"),
    ).toBe(false);
  });

  it("a manager is told a resolved report is ready to close", async () => {
    be.seedIncident({ reporter: wid(), title: "Fixed valve", status: "RESOLVED" });
    const view = await phone("manager@plantx.demo", "/alerts");
    expect(await view.findByText("Ready to close")).toBeTruthy();
    expect(
      be.called("GET", "/v1/incidents").some((c) => c.query.get("status") === "RESOLVED"),
    ).toBe(true);
  });

  it("staff alerts never fetch a detail per report (no per-row requests)", async () => {
    for (let i = 0; i < 4; i++) be.seedIncident({ reporter: wid(), title: `r${i}` });
    const view = await phone("supervisor@plantx.demo", "/alerts");
    await view.findAllByText("Report waiting for triage");
    expect(be.calls.filter((c) => /\/v1\/incidents\/[0-9a-f-]{36}$/.test(c.path))).toHaveLength(0);
  });
});
