import { actionsApi, incidentsApi, uploadFile, type Incident } from "@/lib/api";
import {
  as,
  asRoot,
  defaultBlueprint,
  describeLive,
  failure,
  report,
  RUN,
  uploadAudio,
  words,
} from "./support";

/**
 * Cases the other live pipelines don't reach: retrying speech-to-text, a worker who is the
 * assignee finishing the work, and what a worker may still do once staff take a report over.
 */
describeLive("LIVE retry speech-to-text", () => {
  it("a voice note in an unsupported format stays FAILED after a retry, with the reason", async () => {
    await as("worker");
    const audioKey = await uploadFile({
      blob: new Blob(["definitely not a wav file"]),
      kind: "audio",
      contentType: "audio/wav",
    });
    const { incident } = await report("worker", {
      audioKey,
      description: `Retry STT ${RUN} ${words()}`,
    });
    expect(incident.processing.transcription).toBe("FAILED");

    const retry = await failure(() => incidentsApi.retryTranscription(incident.id));
    expect(retry.status).toBe(422);
    expect(retry.message).toMatch(/Unsupported audio/);
    const after = await incidentsApi.get(incident.id);
    expect(after.processing.transcription).toBe("FAILED");
    expect(after.version).toBe(incident.version); // a failed retry adds no timeline node
  });

  it("there is nothing to retry on a transcribed note or a report without one", async () => {
    const audioKey = await uploadAudio("worker");
    const { incident: transcribed } = await report("worker", {
      audioKey,
      description: `Good audio ${RUN} ${words()}`,
    });
    expect(transcribed.processing.transcription).toBe("COMPLETED");
    const done = await failure(() => incidentsApi.retryTranscription(transcribed.id));
    expect(done.status).toBe(422);
    expect(done.message).toMatch(/nothing to retry/);

    const { incident: silent } = await report("worker", {
      description: `No audio ${RUN} ${words()}`,
    });
    const none = await failure(() => incidentsApi.retryTranscription(silent.id));
    expect(none.status).toBe(422);
    expect(none.message).toMatch(/no voice note/);
  });

  it("another worker can't retry (or even see) someone else's report", async () => {
    const { incident } = await report("worker", { description: `Private ${RUN} ${words()}` });
    await as("contractor");
    expect((await failure(() => incidentsApi.retryTranscription(incident.id))).status).toBe(404);
  });
});

describeLive("LIVE worker as the assignee", () => {
  let incident: Incident;
  let workerId: string;

  it("staff approve a worker's report and assign a one-off fix to that worker", async () => {
    workerId = await as("worker");
    incident = await asRoot(
      (await report("worker", { description: `Assignee ${RUN} ${words()}` })).incident,
    );
    await as("supervisor");
    const approved = await incidentsApi.transition(incident.id, {
      event: "approve",
      expectedVersion: incident.version,
    });
    const action = await actionsApi.assign(incident.id, {
      expectedVersion: approved.version,
      type: "ONE_OFF",
      title: `Tighten flange ${RUN}`,
      assigneeId: workerId,
    });
    expect(action.assignee?.id).toBe(workerId);
    incident = await incidentsApi.get(incident.id);
    expect(incident.status).toBe("ACTION_ASSIGNED");
  });

  it("the worker can't edit or move the pin once staff have approved it (403)", async () => {
    await as("worker");
    const mine = await incidentsApi.get(incident.id);
    expect(mine.permissions.canEdit).toBe(false);
    const edit = await failure(() =>
      incidentsApi.edit(incident.id, { expectedVersion: mine.version, title: "late edit" }),
    );
    expect(edit.status).toBe(403);
    const bp = await defaultBlueprint();
    const move = await failure(() =>
      incidentsApi.move(incident.id, {
        expectedVersion: mine.version,
        blueprintId: bp.id,
        x: 50,
        y: 50,
      }),
    );
    expect(move.status).toBe(403);
  });

  it("the action is in the worker's 'Assigned to me' list", async () => {
    await as("worker");
    const assigned = await actionsApi.list({ mine: true, status: "OPEN,IN_PROGRESS", limit: 100 });
    expect(assigned.some((a) => a.incident.id === incident.id)).toBe(true);
  });

  it("the worker completes it, which resolves the report on the worker's behalf", async () => {
    await as("worker");
    const [action] = await actionsApi.list({ incidentId: incident.id, limit: 10 });
    expect(action).toBeDefined();
    const done = await actionsApi.complete(action!.id);
    expect(done.status).toBe("DONE");
    const resolved = await incidentsApi.get(incident.id);
    expect(resolved.status).toBe("RESOLVED");
    const { nodes } = await incidentsApi.timeline(incident.id);
    expect(nodes.at(-1)?.label).toBe("Worker Resolved");
    // Completing again is refused: the action is finished.
    expect((await failure(() => actionsApi.complete(action!.id))).status).toBe(422);
  });

  it("only a manager can close it; the worker and supervisor are refused", async () => {
    const current = await incidentsApi.get(incident.id);
    await as("worker");
    expect(
      (
        await failure(() =>
          incidentsApi.transition(incident.id, {
            event: "close",
            expectedVersion: current.version,
          }),
        )
      ).status,
    ).toBe(403);
    await as("supervisor");
    expect(
      (
        await failure(() =>
          incidentsApi.transition(incident.id, {
            event: "close",
            expectedVersion: current.version,
          }),
        )
      ).status,
    ).toBe(403);
    await as("manager");
    const closed = await incidentsApi.transition(incident.id, {
      event: "close",
      expectedVersion: current.version,
    });
    expect(closed.status).toBe("CLOSED");
  });
});

describeLive("LIVE rejection seen by the reporter", () => {
  it("a rejected report shows the reason on the worker's timeline and can't be edited", async () => {
    const { incident } = await report("worker", { description: `Reject me ${RUN} ${words()}` });
    await as("supervisor");
    const reason = `Not a hazard: duplicate of a known issue (${RUN})`;
    await incidentsApi.transition(incident.id, {
      event: "reject",
      expectedVersion: incident.version,
      note: reason,
    });
    await as("worker");
    const seen = await incidentsApi.get(incident.id);
    expect(seen.status).toBe("REJECTED");
    expect(seen.permissions.canEdit).toBe(false);
    const { nodes } = await incidentsApi.timeline(incident.id);
    const rejected = nodes.find((n) => n.label === "Supervisor Rejected");
    expect(rejected?.note).toBe(reason);
    const rejectedList = await incidentsApi.list({ status: "REJECTED", limit: 100 });
    expect(rejectedList.items.some((i) => i.id === incident.id)).toBe(true);
  });
});
