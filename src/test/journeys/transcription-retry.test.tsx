import { createFakeBackend, type FakeBackend } from "../fake-backend";
import { cleanup, fireEvent, launch, waitFor } from "../harness";

let be: FakeBackend;
const W = "worker@plantx.demo";
const S = "supervisor@plantx.demo";
beforeEach(() => {
  be = createFakeBackend();
});
afterEach(cleanup);
const wid = () => be.userByEmail(W)!.id;

const FAILED = {
  audioKey: "media/audio/u/a.wav",
  processing: {
    transcription: "FAILED",
    error: "Speech-to-text service failed; retry later",
  },
};

/** Guide §4.4 banner: FAILED transcription shows the reason and, for reporter/staff, a retry. */
describe("Journey: retry speech-to-text", () => {
  it("the reporter retries a failed transcription and the transcript replaces the banner", async () => {
    const rec = be.seedIncident({
      reporter: wid(),
      ...FAILED,
      retryTranscript: "Oil is dripping from pump three",
    });
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}` });
    const banner = await view.findByTestId("transcription-failed");
    expect(view.getByText("Speech-to-text service failed; retry later")).toBeTruthy();
    expect(banner).toBeTruthy();

    await fireEvent.press(await view.findByText("Retry transcription"));
    await waitFor(() => expect(be.called("POST", "/transcription")).toHaveLength(1));
    expect(be.called("POST", "/transcription")[0]?.body ?? null).toBeNull(); // no body
    await waitFor(() => expect(view.queryByTestId("transcription-failed")).toBeNull());
    expect(await view.findByText("Oil is dripping from pump three")).toBeTruthy();
    expect(rec.nodes.map((n) => n.label)).toContain("AI Transcribed Audio");
  });

  it("a retry that fails again keeps the banner and shows the server's reason", async () => {
    const rec = be.seedIncident({
      reporter: wid(),
      ...FAILED,
      retryTranscript: null,
      retryError: "Voice note is longer than 60 seconds",
    });
    const view = await launch(be, { as: W, url: `/incidents/${rec.id}` });
    await fireEvent.press(await view.findByText("Retry transcription"));
    await waitFor(() => expect(be.called("POST", "/transcription")).toHaveLength(1));
    // The banner stays, and the failure is explained rather than silently swallowed.
    expect(await view.findByTestId("transcription-failed")).toBeTruthy();
    // The new reason is shown (next to the banner, and in it once the report is refetched).
    expect(
      (await view.findAllByText("Voice note is longer than 60 seconds")).length,
    ).toBeGreaterThan(0);
    expect(view.queryByTestId("transcript")).toBeNull();
  });

  it("staff can retry a worker's report", async () => {
    const rec = be.seedIncident({ reporter: wid(), ...FAILED, retryTranscript: "Steam leak" });
    const view = await launch(be, { as: S, url: `/incidents/${rec.id}` });
    await fireEvent.press(await view.findByText("Retry transcription"));
    expect(await view.findByText("Steam leak")).toBeTruthy();
  });

  it("a worker viewing the parent of their duplicate sees the reason but no retry", async () => {
    const parent = be.seedIncident({
      reporter: be.userByEmail("contractor@plantx.demo")!.id,
      ...FAILED,
    });
    be.seedIncident({ reporter: wid(), clusterParentId: parent.id, title: "Mine" });
    const view = await launch(be, { as: W, url: `/incidents/${parent.id}` });
    expect(await view.findByTestId("transcription-failed")).toBeTruthy();
    expect(view.queryByText("Retry transcription")).toBeNull();
  });
});
