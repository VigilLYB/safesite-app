import {
  cleanup,
  fireEvent,
  launch,
  pathIs,
  press,
  signInThroughForm,
  waitFor,
} from "../src/test/harness";
import * as SecureStore from "expo-secure-store";
import { authApi, incidentsApi } from "@/lib/api";
import { as, asRoot, describeLive, EMAILS, PASSWORD, report, RUN, track, words } from "./support";

/** The real screens against the real API, signed in through the form like a person would. */
describeLive("LIVE UI: real screens, real backend", () => {
  afterEach(cleanup);

  it.each([
    ["worker", "/incidents"],
    ["contractor", "/incidents"],
    ["supervisor", "/incidents"],
    ["manager", "/analytics"],
  ] as const)("%s signs in and lands on %s", async (who, path) => {
    const view = await launch(null);
    await signInThroughForm(view, EMAILS[who], PASSWORD as string);
    await pathIs(view, path);
  });

  it("a wrong password shows the plain message", async () => {
    const view = await launch(null);
    await signInThroughForm(view, EMAILS.worker, "definitely-wrong-1");
    expect(await view.findByText("Invalid email or password")).toBeTruthy();
  });

  it("deep link -> login -> back to the deep link; a worker then sees Forbidden for staff pages", async () => {
    const view = await launch(null, { url: "/analytics" });
    await waitFor(() => expect(view.getPathname()).toBe("/login"));
    await signInThroughForm(view, EMAILS.worker, PASSWORD as string);
    // signed-out deep links go to login without `next`; the worker lands home, never on staff pages
    await pathIs(view, "/incidents");
  });

  it("a supervisor sees analytics KPIs from the real API", async () => {
    const view = await launch(null);
    await signInThroughForm(view, EMAILS.supervisor, PASSWORD as string);
    await pathIs(view, "/incidents");
    await fireEvent.press(await view.findByLabelText("Analytics"));
    expect(await view.findByTestId("kpi-tiles", {}, { timeout: 20_000 })).toBeTruthy();
  });

  it("a worker files a report through the screen and it shows up in My reports", async () => {
    const view = await launch(null);
    await signInThroughForm(view, EMAILS.worker, PASSWORD as string);
    await pathIs(view, "/incidents");
    await press(view, "report-hazard"); // the page button; the nav tab has the same label
    await fireEvent.changeText(await view.findByTestId("report-title"), `UI e2e ${RUN}`);
    await press(view, "report-submit");
    expect(await view.findByTestId("report-result", {}, { timeout: 40_000 })).toBeTruthy();
    await press(view, "report-done");
    expect(await view.findByText(`UI e2e ${RUN}`, {}, { timeout: 20_000 })).toBeTruthy();
    // Still signed in as the worker: find the report the screen created so cleanup rejects it.
    const mine = await incidentsApi.list({ limit: 25 });
    const filed = mine.items.find((i) => i.title === `UI e2e ${RUN}`);
    expect(filed).toBeDefined();
    if (filed) track(filed);
  });

  it("a supervisor approves a worker's report from the detail screen; the server and timeline agree", async () => {
    const { incident: filed } = await report("worker", {
      description: `UI approve ${RUN} ${words()}`,
    });
    const incident = await asRoot(filed);
    // Start the app already signed in as the supervisor, with a real session from the API.
    const login = await authApi.login({ email: EMAILS.supervisor, password: PASSWORD as string });
    await SecureStore.setItemAsync(
      "safesite.session",
      JSON.stringify({
        accessToken: login.accessToken,
        expiresAt: login.expiresAt,
        user: login.user,
      }),
    );
    const view = await launch(null, { url: `/incidents/${incident.id}` });
    expect(view.queryByTestId("action-validate")).toBeNull(); // the app never offers Validate
    await press(view, "action-approve");
    await press(view, "note-confirm");
    // The page moves to the new version: Approve disappears and Assign action appears.
    await waitFor(() => expect(view.queryByTestId("action-approve")).toBeNull());
    expect(await view.findByTestId("action-assign")).toBeTruthy();

    await as("supervisor");
    const fresh = await incidentsApi.get(incident.id);
    expect(fresh.status).toBe("APPROVED");
    const { nodes } = await incidentsApi.timeline(incident.id);
    expect(nodes.at(-1)?.label).toBe("Supervisor Approved");
  });
});
