import { QueryClient } from "@tanstack/react-query";
import { ApiError, authBridge, type Incident } from "@/lib/api";
import { setClock, systemClock } from "@/lib/clock";
import { replayOutbox, type ReplayDeps } from "@/features/sync";
import {
  dequeueOfflineReport,
  flushOfflineQueue,
  listOfflineReports,
  type SubmitDeps,
} from "@/features/report";
import { enqueueOfflineReport } from "@/features/report/lib/offline-queue";
import { sentLater } from "@/features/incidents/components/IncidentHeader";
import { memoryFiles } from "./files";
import { forgetFloorPlanImages, localFloorPlanImage, syncFloorPlanImages } from "./floor-plans";
import { createOutbox, type OutboxChange } from "./outbox";
import { clearQueryCache, MAX_AGE_MS, persistQueryCache, restoreQueryCache } from "./query-cache";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const INC = "00000000-0000-4000-8000-000000000101";
const OTHER_INC = "00000000-0000-4000-8000-000000000102";

const apiError = (status: number, code: string, message = code) =>
  new ApiError({
    status,
    code,
    message,
    kind:
      status === 0
        ? "network"
        : status === 409
          ? "conflict"
          : status === 401
            ? "unauthorized"
            : status >= 500
              ? "server"
              : "validation",
  });

const edit = (version: number, title: string): OutboxChange => ({
  kind: "incident.edit",
  incidentId: INC,
  body: { expectedVersion: version, title },
});

afterEach(() => setClock(systemClock));

describe("outbox", () => {
  it("keeps each person's changes in their own file and survives a reload", async () => {
    const files = memoryFiles();
    const box = createOutbox(files);
    await box.load(A);
    await box.add({ label: "one", change: edit(3, "x") });
    await box.flushed();

    const again = createOutbox(files);
    await again.load(B);
    expect(again.entries()).toHaveLength(0); // someone else signed in: nothing of A's
    await again.load(A);
    expect(again.entries().map((e) => e.label)).toEqual(["one"]);
  });

  it("discarding a change moves later changes to the same report back one version", async () => {
    const box = createOutbox(memoryFiles());
    await box.load(A);
    const first = await box.add({ label: "1", change: edit(3, "a") });
    await box.add({ label: "2", change: edit(4, "b") });
    await box.add({
      label: "other report",
      change: { ...edit(9, "c"), incidentId: OTHER_INC } as OutboxChange,
    });
    await box.discard(first.id);
    const [second, other] = box.entries();
    expect(second?.change.kind === "incident.edit" && second.change.body.expectedVersion).toBe(3);
    expect(other?.change.kind === "incident.edit" && other.change.body.expectedVersion).toBe(9);
  });

  it("'send mine anyway' rebases the change and the ones queued after it", async () => {
    const box = createOutbox(memoryFiles());
    await box.load(A);
    const first = await box.add({ label: "1", change: edit(3, "a") });
    await box.add({ label: "2", change: edit(4, "b") });
    await box.mark(first.id, "conflict", "changed");
    await box.rebase(first.id, 7); // someone else moved the report to v7
    const versions = box
      .entries()
      .map((e) => (e.change.kind === "incident.edit" ? e.change.body.expectedVersion : null));
    expect(versions).toEqual([7, 8]);
    expect(box.entries()[0]?.status).toBe("pending");
  });
});

describe("replayOutbox", () => {
  const incident = (fields: Partial<Incident>) => ({ version: 5, ...fields }) as Incident;

  function deps(overrides: Partial<ReplayDeps> = {}): ReplayDeps {
    return {
      edit: jest.fn().mockResolvedValue(incident({})),
      transition: jest.fn().mockResolvedValue(incident({})),
      getIncident: jest.fn().mockResolvedValue(incident({})),
      completeMilestone: jest.fn().mockResolvedValue({}),
      completeAction: jest.fn().mockResolvedValue({}),
      ...overrides,
    };
  }

  async function boxWith(...changes: OutboxChange[]) {
    const box = createOutbox(memoryFiles());
    await box.load(A);
    for (const change of changes) await box.add({ label: "x", change });
    return box;
  }

  it("sends in order and empties the outbox", async () => {
    const d = deps();
    const box = await boxWith(edit(3, "a"), edit(4, "b"));
    const result = await replayOutbox(box, d);
    expect(result).toMatchObject({ stopped: false });
    expect(result.sent).toHaveLength(2);
    expect((d.edit as jest.Mock).mock.calls.map((c) => c[1].expectedVersion)).toEqual([3, 4]);
    expect(box.entries()).toHaveLength(0);
  });

  it("stops on a connection problem and keeps everything, in order", async () => {
    const d = deps({ edit: jest.fn().mockRejectedValue(apiError(0, "NETWORK_ERROR")) });
    const box = await boxWith(edit(3, "a"), edit(4, "b"));
    const result = await replayOutbox(box, d);
    expect(result.stopped).toBe(true);
    expect(d.edit).toHaveBeenCalledTimes(1);
    expect(box.entries().map((e) => e.status)).toEqual(["pending", "pending"]);
  });

  it("a 409 becomes a conflict, and later changes to that report wait behind it", async () => {
    const d = deps({
      edit: jest.fn().mockRejectedValue(apiError(409, "STALE_VERSION")),
      getIncident: jest.fn().mockResolvedValue(incident({ title: "someone else's" })),
    });
    const box = await boxWith(edit(3, "a"), edit(4, "b"), {
      kind: "action.complete",
      actionId: "act",
      incidentId: INC,
    });
    await replayOutbox(box, d);
    expect(d.edit).toHaveBeenCalledTimes(1);
    expect(d.completeAction).toHaveBeenCalledTimes(1); // not version-checked: not blocked
    expect(box.entries().map((e) => e.status)).toEqual(["conflict", "pending"]);
    expect(box.entries()[0]?.error).toMatch(/Someone else changed this report/);
  });

  it("a 409 on an edit that already landed (lost answer) counts as sent", async () => {
    const d = deps({
      edit: jest.fn().mockRejectedValue(apiError(409, "STALE_VERSION")),
      getIncident: jest.fn().mockResolvedValue(incident({ title: "a" })),
    });
    const box = await boxWith(edit(3, "a"));
    const { sent } = await replayOutbox(box, d);
    expect(sent).toHaveLength(1);
    expect(box.entries()).toHaveLength(0);
  });

  it("a refusal (422) is marked failed with the reason, and the rest still go", async () => {
    const d = deps({
      completeMilestone: jest
        .fn()
        .mockRejectedValue(apiError(422, "UNPROCESSABLE", "Action is CANCELLED")),
    });
    const box = await boxWith(
      { kind: "action.milestone", actionId: "act", milestoneId: "m1", incidentId: OTHER_INC },
      edit(3, "a"),
    );
    await replayOutbox(box, d);
    expect(box.entries()).toHaveLength(1);
    expect(box.entries()[0]).toMatchObject({ status: "failed", error: "Action is CANCELLED" });
    expect(d.edit).toHaveBeenCalledTimes(1);
  });
});

describe("saved reports", () => {
  const input = {
    clientSubmissionId: "s",
    severity: "MEDIUM" as const,
    category: "",
    title: "Leak",
    description: "",
    pin: null,
    gps: null,
    custom: {},
  };
  const submitDeps = (submit: SubmitDeps["submit"]): SubmitDeps => ({
    upload: jest.fn().mockResolvedValue("photo/key"),
    submit,
    sleep: async () => undefined,
    nowMs: () => 0,
  });

  it("are only listed for, and sent by, the person who saved them", async () => {
    const files = memoryFiles();
    await enqueueOfflineReport({ id: "r1", userId: A, input, photo: null, audio: null }, files);
    await enqueueOfflineReport({ id: "r2", userId: B, input, photo: null, audio: null }, files);
    expect((await listOfflineReports(A, files)).map((r) => r.id)).toEqual(["r1"]);

    const submit = jest.fn().mockResolvedValue({});
    const result = await flushOfflineQueue(submitDeps(submit), A, files);
    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(await listOfflineReports(A, files)).toHaveLength(0);
    expect(await listOfflineReports(B, files)).toHaveLength(1); // B's waits for B
  });

  it("a refused report is kept as failed and not resent; a connection error keeps it pending", async () => {
    const files = memoryFiles();
    await enqueueOfflineReport({ id: "r1", userId: A, input, photo: null, audio: null }, files);
    await enqueueOfflineReport(
      {
        id: "r2",
        userId: A,
        input: { ...input, clientSubmissionId: "t" },
        photo: null,
        audio: null,
      },
      files,
    );
    const submit = jest.fn(async (body: { clientSubmissionId: string }) => {
      if (body.clientSubmissionId === "s") throw apiError(400, "VALIDATION_FAILED", "Too long");
      throw apiError(0, "NETWORK_ERROR");
    });
    const result = await flushOfflineQueue(submitDeps(submit as never), A, files);
    expect(result).toEqual({ sent: 0, failed: 1 });
    const saved = await listOfflineReports(A, files);
    expect(saved.map((r) => [r.id, r.status, r.error])).toEqual([
      ["r1", "failed", "Too long"],
      ["r2", "pending", null],
    ]);

    submit.mockClear();
    await flushOfflineQueue(submitDeps(submit as never), A, files);
    // Only r2 is tried again (3 = first try + two resends of the ambiguous failure).
    expect(submit.mock.calls.every(([body]) => body.clientSubmissionId === "t")).toBe(true);
    await dequeueOfflineReport("r1", files);
  });
});

describe("saved reads (query cache)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("saves successful reads and restores them for the same person only", async () => {
    const files = memoryFiles();
    const client = new QueryClient();
    const stop = persistQueryCache(client, A, files);
    client.setQueryData(["incidents", "detail", INC], { id: INC, title: "Leak" });
    await jest.advanceTimersByTimeAsync(1_500);
    stop();

    const fresh = new QueryClient();
    await restoreQueryCache(fresh, B, files);
    expect(fresh.getQueryData(["incidents", "detail", INC])).toBeUndefined();
    // B's sign-in also removed A's saved reads from the device.
    await restoreQueryCache(fresh, A, files);
    expect(fresh.getQueryData(["incidents", "detail", INC])).toBeUndefined();
  });

  it("restores for the owner, ignores data past the maximum age, and clears on sign-out", async () => {
    const files = memoryFiles();
    const client = new QueryClient();
    const stop = persistQueryCache(client, A, files);
    client.setQueryData(["actions", "list", {}], { items: [1] });
    await jest.advanceTimersByTimeAsync(1_500);
    stop();

    const restored = new QueryClient();
    await restoreQueryCache(restored, A, files);
    expect(restored.getQueryData(["actions", "list", {}])).toEqual({ items: [1] });

    setClock({
      now: () => new Date(Date.now() + MAX_AGE_MS + 1),
      nowMs: () => Date.now() + MAX_AGE_MS + 1,
    });
    const tooOld = new QueryClient();
    await restoreQueryCache(tooOld, A, files);
    expect(tooOld.getQueryData(["actions", "list", {}])).toBeUndefined();

    await clearQueryCache(files);
    expect(await files.list(["query-cache"])).toEqual([]);
  });
});

describe("authBridge.refresh", () => {
  afterEach(() => {
    authBridge.setRefreshHandler(null);
    authBridge.setToken(null);
  });

  it("shares one refresh between calls that fail together", async () => {
    authBridge.setToken("old");
    let resolve: (token: string) => void = () => undefined;
    const handler = jest.fn(
      () =>
        new Promise<string | null>((r) => {
          resolve = (token) => {
            authBridge.setToken(token);
            r(token);
          };
        }),
    );
    authBridge.setRefreshHandler(handler);
    const first = authBridge.refresh("old");
    const second = authBridge.refresh("old");
    resolve("new");
    await expect(Promise.all([first, second])).resolves.toEqual(["new", "new"]);
    expect(handler).toHaveBeenCalledTimes(1);
    // A call that still carried the old token reuses the new one without asking again.
    await expect(authBridge.refresh("old")).resolves.toBe("new");
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("sentLater (incident header 'Seen …, sent later')", () => {
  it("only flags reports that reached the server well after they were captured", () => {
    expect(sentLater(null, "2026-11-13T10:00:00Z")).toBe(false);
    expect(sentLater("2026-11-13T09:58:00Z", "2026-11-13T10:00:00Z")).toBe(false);
    expect(sentLater("2026-11-13T06:00:00Z", "2026-11-13T10:00:00Z")).toBe(true);
  });
});

describe("floor-plan images", () => {
  it("downloads new images once, skips ones already saved, and removes unused ones", async () => {
    forgetFloorPlanImages();
    const files = memoryFiles();
    const download = jest.spyOn(files, "download");
    const plans = [
      { imageKey: "blueprint/a.png", imageUrl: "https://s3/a?sig=1" },
      { imageKey: null, imageUrl: null },
    ];
    expect(await syncFloorPlanImages(plans, files)).toBe(1);
    expect(await syncFloorPlanImages(plans, files)).toBe(0); // already on the device
    expect(download).toHaveBeenCalledTimes(1);
    expect(await localFloorPlanImage("blueprint/a.png", files)).toMatch(/^memory:/);

    // The plan gets a new image: the new one is downloaded and the old file removed.
    await syncFloorPlanImages([{ imageKey: "blueprint/b.png", imageUrl: "https://s3/b" }], files);
    expect(await files.list(["floor-plans"])).toEqual(["blueprint_b.png"]);
  });

  it("one failed download does not stop the others", async () => {
    forgetFloorPlanImages();
    const files = memoryFiles();
    const real = files.download.bind(files);
    jest.spyOn(files, "download").mockImplementation(async (url, path) => {
      if (url.includes("bad")) throw new Error("connection lost");
      return real(url, path);
    });
    const count = await syncFloorPlanImages(
      [
        { imageKey: "bad.png", imageUrl: "https://s3/bad" },
        { imageKey: "good.png", imageUrl: "https://s3/good" },
      ],
      files,
    );
    expect(count).toBe(1);
    expect(await files.list(["floor-plans"])).toEqual(["good.png"]);
  });
});
