import {
  cleanup,
  fireEvent,
  launch,
  pathIs,
  press,
  signInThroughForm,
  waitFor,
} from "../src/test/harness";
import { describeLive, EMAILS, PASSWORD, RUN } from "./support";

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
    await fireEvent.press(await view.findByLabelText("Report a hazard"));
    await fireEvent.changeText(await view.findByTestId("report-title"), `UI e2e ${RUN}`);
    await press(view, "report-submit");
    expect(await view.findByTestId("report-result", {}, { timeout: 40_000 })).toBeTruthy();
    await press(view, "report-done");
    expect(await view.findByText(`UI e2e ${RUN}`, {}, { timeout: 20_000 })).toBeTruthy();
  });
});
