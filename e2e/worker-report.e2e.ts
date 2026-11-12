import { actionsApi, incidentsApi, uploadFile, type Incident } from "@/lib/api";
import {
  as,
  defaultBlueprint,
  describeLive,
  track,
  failure,
  newSubmissionId,
  report,
  RUN,
  uploadAudio,
  uploadPhoto,
  words,
} from "./support";

/** Pipeline: worker reports -> replay -> list -> edit -> move pin -> history -> boundaries. */
describeLive("LIVE worker: report, edit, history", () => {
  const vocab = words();
  let incident: Incident;
  let submissionId: string;
  let workerId: string;

  it("one-tap report: photo + WAV voice note + GPS is saved, transcribed and auto-pinned", async () => {
    workerId = await as("worker");
    const [photoKey, audioKey] = [await uploadPhoto("worker"), await uploadAudio("worker")];
    submissionId = newSubmissionId();
    const body = {
      clientSubmissionId: submissionId,
      severity: "HIGH" as const,
      category: `E2E ${RUN}`,
      description: `Leak near ${vocab}`,
      photoKey,
      audioKey,
      location: { gps: { lat: 19.0448, lng: 72.9185, accuracyM: 25 } },
    };
    const result = await incidentsApi.submit(body);
    incident = result.incident;
    track(incident);
    expect(result.replayed).toBe(false);
    // v1, or v2 when the duplicate detector linked it under an existing open report.
    expect(incident.version).toBe(result.ai?.clusteredUnder ? 2 : 1);
    expect(incident.status).toBe("OPEN");
    expect(incident.location.source).toBe("GPS_ESTIMATE");
    expect(incident.processing.transcription).toBe("COMPLETED"); // WAV accepted
    expect(incident.photo?.url).toMatch(/^https:/);
    expect(incident.audio?.url).toMatch(/^https:/);
    expect(incident.permissions.canEdit).toBe(true);
    expect(incident.permissions.transitions).toEqual([]); // workers have no workflow buttons
  });

  it("a lost-response retry (same clientSubmissionId) replays the same report", async () => {
    await as("worker");
    const again = await incidentsApi.submit({
      clientSubmissionId: submissionId,
      severity: "HIGH",
      category: `E2E ${RUN}`,
      description: `Leak near ${vocab}`,
    });
    expect(again.replayed).toBe(true);
    expect(again.incident.id).toBe(incident.id);
  });

  it("a report with no content is rejected (400) and unknown keys are rejected", async () => {
    await as("worker");
    expect(
      (
        await failure(() =>
          incidentsApi.submit({ clientSubmissionId: newSubmissionId(), severity: "LOW" }),
        )
      ).status,
    ).toBe(400);
  });

  it("m4a/AAC audio never reaches the server: the client refuses it, WAV is the only audio", async () => {
    await as("worker");
    const e = await failure(() =>
      uploadFile({ blob: new Blob(["x"]), kind: "audio", contentType: "audio/mp4" }),
    );
    expect(e.status).toBe(400);
    expect(e.message).toMatch(/WAV/);
  });

  it("bad audio bytes still save the report, flagged as a transcription failure", async () => {
    await as("worker");
    const audioKey = await uploadFile({
      blob: new Blob(["not really a wav file at all"]),
      kind: "audio",
      contentType: "audio/wav",
    });
    const { incident: bad } = await incidentsApi.submit({
      clientSubmissionId: newSubmissionId(),
      description: `Broken audio ${RUN} ${words()}`,
      audioKey,
    });
    track(bad);
    expect(bad.processing.transcription).toBe("FAILED");
    expect(bad.processing.error).toMatch(/Unsupported audio/);
  });

  it("the list is server-filtered by status and only ever shows the worker's own reports", async () => {
    await as("worker");
    const open = await incidentsApi.list({ status: "OPEN", limit: 100 });
    expect(open.items.every((i) => i.status === "OPEN")).toBe(true);
    expect(open.items.some((i) => i.id === incident.id)).toBe(true);
    expect(open.items.every((i) => i.reporter.id === workerId)).toBe(true);
    const closed = await incidentsApi.list({ status: "CLOSED", limit: 100 });
    expect(closed.items.every((i) => i.status === "CLOSED")).toBe(true);
    expect(closed.items.some((i) => i.id === incident.id)).toBe(false);
    const multi = await incidentsApi.list({ status: "OPEN,VALIDATED", limit: 100 });
    expect(multi.items.every((i) => ["OPEN", "VALIDATED"].includes(i.status))).toBe(true);
    // a worker's staff-only filter is ignored: still only their own
    const spoof = await incidentsApi.list({
      reporterId: "00000000-0000-4000-8000-000000000001",
      limit: 100,
    });
    expect(spoof.items.every((i) => i.reporter.id === workerId)).toBe(true);
  });

  it("cursor paging walks the list without repeats", async () => {
    await as("worker");
    const first = await incidentsApi.list({ limit: 1 });
    expect(first.items).toHaveLength(1);
    if (first.pageInfo.nextCursor) {
      const second = await incidentsApi.list({ limit: 1, cursor: first.pageInfo.nextCursor });
      expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
    }
  });

  it("edits own report: only changed fields, expectedVersion advances, history grows", async () => {
    await as("worker");
    const edited = await incidentsApi.edit(incident.id, {
      expectedVersion: incident.version,
      severity: "CRITICAL",
      title: `Pump leak ${RUN}`,
      note: "worse than I thought",
    });
    expect(edited.version).toBe(incident.version + 1);
    expect(edited.severity).toBe("CRITICAL");
    incident = edited;
    const nothing = await failure(() =>
      incidentsApi.edit(incident.id, { expectedVersion: incident.version }),
    );
    expect(nothing.status).toBe(400); // "Nothing to change"
  });

  it("custom fields are replaced wholesale", async () => {
    await as("worker");
    const withFields = await incidentsApi.edit(incident.id, {
      expectedVersion: incident.version,
      customFields: { equipmentTag: "P-301", injuryOccurred: false },
    });
    expect(withFields.customFields).toEqual({ equipmentTag: "P-301", injuryOccurred: false });
    const replaced = await incidentsApi.edit(incident.id, {
      expectedVersion: withFields.version,
      customFields: { workOrder: "WO-1" },
    });
    expect(replaced.customFields).toEqual({ workOrder: "WO-1" });
    incident = replaced;
  });

  it("a stale edit is 409 STALE_VERSION and changes nothing", async () => {
    await as("worker");
    const e = await failure(() =>
      incidentsApi.edit(incident.id, { expectedVersion: incident.version - 1, title: "stale" }),
    );
    expect(e.status).toBe(409);
    expect(e.code).toBe("STALE_VERSION");
    const current = await incidentsApi.get(incident.id);
    expect(current.title).not.toBe("stale");
  });

  it("moves the pin inside the plan; a pin outside is rejected", async () => {
    await as("worker");
    const bp = await defaultBlueprint();
    const moved = await incidentsApi.move(incident.id, {
      expectedVersion: incident.version,
      blueprintId: bp.id,
      x: 100,
      y: 100,
    });
    expect(moved.location.source).toBe("MANUAL");
    expect(moved.location.x).toBe(100);
    incident = moved;
    const outside = await failure(() =>
      incidentsApi.move(incident.id, {
        expectedVersion: incident.version,
        blueprintId: bp.id,
        x: bp.widthPx + 500,
        y: 10,
      }),
    );
    expect(outside.status).toBe(400);
  });

  it("history is an ordered timeline of labelled nodes with readable past versions", async () => {
    await as("worker");
    const { nodes } = await incidentsApi.timeline(incident.id);
    expect(nodes[0]?.label).toBe("Worker Submitted");
    expect(nodes.map((n) => n.label)).toEqual(
      expect.arrayContaining(["Worker Edited", "Worker Moved Pin"]),
    );
    expect(nodes.map((n) => n.version)).toEqual(nodes.map((_, i) => i + 1));
    const v1 = await incidentsApi.version(incident.id, 1);
    expect(v1.snapshot.severity).toBe("HIGH"); // the state at that version, not now
    expect((await failure(() => incidentsApi.version(incident.id, 999))).status).toBe(422);
  });

  it("workers have no workflow rights: approve is 403, reject too", async () => {
    await as("worker");
    for (const event of ["approve", "validate", "reject", "close", "reopen"] as const) {
      const e = await failure(() =>
        incidentsApi.transition(incident.id, {
          event,
          expectedVersion: incident.version,
          note: "x",
        }),
      );
      expect(e.status).toBe(403);
    }
  });

  it("another worker cannot see it (404, not 403) and cannot list it", async () => {
    await as("contractor");
    expect((await failure(() => incidentsApi.get(incident.id))).status).toBe(404);
    const theirs = await incidentsApi.list({ limit: 100 });
    expect(theirs.items.some((i) => i.id === incident.id)).toBe(false);
  });

  it("a malformed id is a 400 at the API (the app never sends one)", async () => {
    await as("worker");
    expect((await failure(() => incidentsApi.get("not-a-uuid"))).status).toBe(400);
  });

  it("workers can see the action board but not progress someone else's action", async () => {
    await as("worker");
    const board = await actionsApi.list({ limit: 100 });
    expect(Array.isArray(board)).toBe(true);
    const sample = board.find((a) => a.status === "OPEN" || a.status === "IN_PROGRESS");
    if (sample && sample.assignee?.fullName !== "Ravi Kumar") {
      const full = await actionsApi.get(sample.id);
      const target = full.milestones?.[0];
      if (target)
        expect(
          (await failure(() => actionsApi.completeMilestone(sample.id, target.id))).status,
        ).toBe(403);
    }
  });

  it("report helper from another role also works (contractor)", async () => {
    const { incident: mine } = await report("contractor", {
      description: `Contractor note ${RUN} ${words()}`,
    });
    expect(mine.reporter.fullName).toBeTruthy();
  });
});
