import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { cleanup, fireEvent, launch, press, tapMap, type View, waitFor } from "../harness";

let be: FakeBackend;
beforeEach(() => {
  be = createFakeBackend();
});
afterEach(cleanup);

const open = (as = "worker@plantx.demo") => launch(be, { as, url: "/report" });
const fill = async (view: View, id: string, text: string) =>
  fireEvent.changeText(await view.findByTestId(id), text);

describe("Journey: worker reports a hazard", () => {
  it("photo + severity + title + GPS: the exact body, the result, then the report", async () => {
    const view = await open();
    await press(view, "take-photo");
    await press(view, "severity-HIGH");
    await fill(view, "report-title", "  Steam leak at P-301  ");
    await fill(view, "report-category", "Chemical leak");
    await view.findByText("Location captured (±25 m)");
    await press(view, "report-submit");

    expect(await view.findByTestId("report-result")).toBeTruthy();
    const uploads = be.called("POST", "/v1/uploads");
    expect(uploads[0]?.body).toEqual({ kind: "photo", contentType: "image/jpeg", sizeBytes: 1 });
    const [submit] = be.called("POST", "/v1/incidents").filter((c) => c.path === "/v1/incidents");
    const body = submit?.body as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(
      ["category", "clientSubmissionId", "location", "photoKey", "severity", "title"].sort(),
    );
    expect(body).toMatchObject({
      severity: "HIGH",
      title: "Steam leak at P-301",
      category: "Chemical leak",
      location: { gps: { lat: 19.07, lng: 72.87, accuracyM: 25 } },
    });
    expect(String(body.photoKey)).toMatch(/^photo\//);
    // The GPS fix landed as an estimated pin the person can adjust.
    expect(await view.findByText("Pin estimated in Pump Room")).toBeTruthy();
    await press(view, "view-report");
    expect(await view.findByTestId("incident-title")).toBeTruthy();
  });

  it("nothing to report: blocked on the client, no request sent", async () => {
    const view = await open();
    await press(view, "report-submit");
    expect(
      await view.findByText(/Add a photo, a voice note, a title or a description/),
    ).toBeTruthy();
    expect(be.called("POST", "/v1/incidents")).toHaveLength(0);
  });

  it("a title over 200 characters is rejected before sending", async () => {
    const view = await open();
    await fill(view, "report-title", "x".repeat(201));
    await press(view, "report-submit");
    expect(await view.findByText("Keep the title under 200 characters.")).toBeTruthy();
    expect(be.called("POST", "/v1/incidents")).toHaveLength(0);
  });

  it("a lost response is resent with the SAME clientSubmissionId and replays, not duplicates", async () => {
    be.flags.dropResponse = /POST \/v1\/incidents$/;
    const view = await open();
    await fill(view, "report-title", "Frayed cable");
    await press(view, "report-submit");
    await view.findByTestId("report-result", {}, { timeout: 5000 });
    const sends = be.called("POST", "/v1/incidents").filter((c) => c.path === "/v1/incidents");
    expect(sends).toHaveLength(2);
    expect((sends[0]?.body as { clientSubmissionId: string }).clientSubmissionId).toBe(
      (sends[1]?.body as { clientSubmissionId: string }).clientSubmissionId,
    );
    expect(be.incidents.size).toBe(1);
    expect(await view.findByText("This report was already saved.")).toBeTruthy();
  });

  it("a server 400 keeps the draft and a corrected resend reuses the same key", async () => {
    be.flags.failNext.push({
      match: /POST \/v1\/incidents$/,
      status: 400,
      body: {
        error: {
          code: "VALIDATION_FAILED",
          message: "Pin is outside the blueprint bounds",
          correlationId: "c",
        },
      },
    });
    const view = await open();
    await fill(view, "report-title", "Loose guard");
    await press(view, "report-submit");
    expect(await view.findByText("Pin is outside the blueprint bounds")).toBeTruthy();
    await press(view, "report-submit");
    await view.findByTestId("report-result");
    const ids = be
      .called("POST", "/v1/incidents")
      .filter((c) => c.path === "/v1/incidents")
      .map((c) => (c.body as { clientSubmissionId: string }).clientSubmissionId);
    expect(new Set(ids).size).toBe(1);
  });

  it("a manual pin is sent with its blueprint and wins over GPS", async () => {
    const view = await open();
    await fill(view, "report-title", "Spill");
    await press(view, "place-pin");
    await tapMap(view, 300, 200);
    await press(view, "report-submit");
    await view.findByTestId("report-result");
    const body = be.called("POST", "/v1/incidents").find((c) => c.path === "/v1/incidents")
      ?.body as { location: unknown };
    expect(body.location).toEqual({
      blueprintId: "b0000000-0000-4000-8000-000000000001",
      pin: { x: 300, y: 200 },
      gps: { lat: 19.07, lng: 72.87, accuracyM: 25 },
    });
  });

  it("'Report another' starts a NEW submission id", async () => {
    const view = await open();
    await fill(view, "report-title", "First");
    await press(view, "report-submit");
    await view.findByTestId("report-result");
    await press(view, "report-another");
    await fill(view, "report-title", "Second");
    await press(view, "report-submit");
    await waitFor(() => expect(be.incidents.size).toBe(2));
  });

  it("severity defaults to Medium and is always sent", async () => {
    const view = await open();
    await fill(view, "report-title", "Default severity");
    await press(view, "report-submit");
    await view.findByTestId("report-result");
    const body = be.called("POST", "/v1/incidents").find((c) => c.path === "/v1/incidents")
      ?.body as { severity: string };
    expect(body.severity).toBe("MEDIUM");
  });
});
