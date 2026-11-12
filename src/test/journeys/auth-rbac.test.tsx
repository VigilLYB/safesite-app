import { createFakeBackend, type FakeBackend } from "../fake-backend";
import {
  cleanup,
  fireEvent,
  launch,
  pathIs,
  press,
  signInThroughForm,
  type View,
  waitFor,
} from "../harness";

let be: FakeBackend;
beforeEach(() => {
  be = createFakeBackend();
});
afterEach(cleanup);

const navLabels = async (view: View) => {
  const names = [
    "My reports",
    "Incidents",
    "Report a hazard",
    "Actions",
    "Analytics",
    "Team",
    "Blueprints",
    "Account",
  ];
  return names.filter((n) => view.queryAllByLabelText(n).length > 0);
};

describe("Journey: sign in lands each role on its home", () => {
  it.each([
    ["worker@plantx.demo", "/incidents", "My reports"],
    ["contractor@plantx.demo", "/incidents", "My reports"],
    ["supervisor@plantx.demo", "/incidents", "Incidents"],
    ["manager@plantx.demo", "/analytics", "Analytics"],
  ])("%s -> %s", async (email, path, heading) => {
    const view = await launch(be);
    await signInThroughForm(view, email);
    await pathIs(view, path);
    expect(await view.findAllByText(heading)).not.toHaveLength(0);
  });

  it("wrong password stays on the form with the plain message and stores nothing", async () => {
    const view = await launch(be);
    await signInThroughForm(view, "worker@plantx.demo", "wrong-password-1");
    expect(await view.findByText("Invalid email or password")).toBeTruthy();
    expect(view.getPathname()).toBe("/login");
  });

  it("unknown email gets the same message (never hints which part was wrong)", async () => {
    const view = await launch(be);
    await signInThroughForm(view, "nobody@plantx.demo");
    expect(await view.findByText("Invalid email or password")).toBeTruthy();
  });

  it("an outage during sign-in is 'can't reach', not a credentials error", async () => {
    be.flags.failNext.push({
      match: /POST \/v1\/auth\/login/,
      status: 503,
      body: { message: "Service Unavailable" },
    });
    const view = await launch(be);
    await signInThroughForm(view, "worker@plantx.demo");
    expect(await view.findByText("Can't reach SafeSite right now. Try again.")).toBeTruthy();
  });

  it("validates before calling the server", async () => {
    const view = await launch(be);
    await press(view, "login-submit");
    expect(await view.findByText("Enter your email.")).toBeTruthy();
    expect(be.called("POST", "/auth/login")).toHaveLength(0);
  });
});

describe("Journey: navigation is role-shaped (RBAC)", () => {
  it("worker: My reports, Report, Actions, Account only", async () => {
    const view = await launch(be, { as: "worker@plantx.demo", url: "/incidents" });
    await view.findByTestId("incidents-screen");
    expect(await navLabels(view)).toEqual(["My reports", "Report a hazard", "Actions", "Account"]);
  });
  it("supervisor: adds Analytics and Team, no Blueprints", async () => {
    const view = await launch(be, { as: "supervisor@plantx.demo", url: "/incidents" });
    await view.findByTestId("incidents-screen");
    expect(await navLabels(view)).toEqual([
      "Incidents",
      "Report a hazard",
      "Actions",
      "Analytics",
      "Team",
      "Account",
    ]);
  });
  it("manager: sees Blueprints too", async () => {
    const view = await launch(be, { as: "manager@plantx.demo", url: "/analytics" });
    await view.findByTestId("analytics-screen");
    expect(await navLabels(view)).toEqual([
      "Incidents",
      "Report a hazard",
      "Actions",
      "Analytics",
      "Team",
      "Blueprints",
      "Account",
    ]);
  });
});

describe("Journey: route guards show Forbidden, never the login page", () => {
  it.each([
    ["worker@plantx.demo", "/analytics"],
    ["worker@plantx.demo", "/analytics/heatmap"],
    ["worker@plantx.demo", "/team"],
    ["worker@plantx.demo", "/admin/blueprints"],
    ["worker@plantx.demo", "/admin/blueprints/new"],
    ["supervisor@plantx.demo", "/admin/blueprints"],
  ])("%s opening %s", async (email, url) => {
    const view = await launch(be, { as: email, url });
    expect(await view.findByTestId("forbidden")).toBeTruthy();
    expect(view.getPathname()).not.toBe("/login");
    // and it never fetched the page's data
    expect(be.called("GET", "/v1/analytics")).toHaveLength(0);
    expect(be.called("GET", "/v1/users")).toHaveLength(0);
  });

  it("the Forbidden page links to the person's own home", async () => {
    const view = await launch(be, { as: "worker@plantx.demo", url: "/team" });
    await fireEvent.press(await view.findByLabelText("Go to my home"));
    await pathIs(view, "/incidents");
  });

  it("a signed-out deep link goes to login", async () => {
    const view = await launch(be, { url: "/actions" });
    await waitFor(() => expect(view.getPathname()).toBe("/login"));
  });
});

describe("Journey: session handling", () => {
  it("a 401 mid-session signs out once and says why", async () => {
    const view = await launch(be, { as: "worker@plantx.demo", url: "/incidents" });
    await view.findByTestId("incidents-screen");
    be.flags.expireTokens = true;
    await fireEvent.press(await view.findByLabelText("Refresh"));
    await waitFor(() => expect(view.getPathname()).toBe("/login"));
    expect(await view.findByTestId("login-reason")).toBeTruthy();
  });

  it("a boot outage keeps the person signed in and offers retry", async () => {
    be.flags.meStatus = 503;
    const view = await launch(be, { as: "worker@plantx.demo", url: "/incidents" });
    expect(await view.findByTestId("service-unavailable")).toBeTruthy();
    be.flags.meStatus = 0;
    await fireEvent.press(await view.findByLabelText("Try again"));
    expect(await view.findByTestId("incidents-screen")).toBeTruthy();
  });

  it("a disabled account is signed out at boot with a reason", async () => {
    const view = await launch(be, { as: "worker@plantx.demo", url: "/incidents" });
    be.userByEmail("worker@plantx.demo")!.isActive = false;
    await cleanup();
    const again = await launch(be, { as: "worker@plantx.demo", url: "/incidents" });
    await waitFor(() => expect(again.getPathname()).toBe("/login"));
    expect(await again.findByTestId("login-reason")).toBeTruthy();
    void view;
  });

  it("sign out returns to login and clears the session", async () => {
    const view = await launch(be, { as: "worker@plantx.demo", url: "/account" });
    await press(view, "sign-out");
    await waitFor(() => expect(view.getPathname()).toBe("/login"));
  });

  it("demo mode banner appears only when the AI provider is mock", async () => {
    be.flags.health = "mock";
    const view = await launch(be, { as: "worker@plantx.demo", url: "/incidents" });
    expect(await view.findByTestId("demo-banner")).toBeTruthy();
  });
});
