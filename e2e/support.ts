import { randomUUID } from "node:crypto";
import { appendFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import {
  actionsApi,
  authApi,
  authBridge,
  uploadFile,
  type Incident,
  type SubmitIncidentInput,
  incidentsApi,
  blueprintsApi,
} from "@/lib/api";
import { encodeWav } from "@/features/media/lib/wav";

export const PASSWORD = process.env.E2E_PASSWORD ?? process.env.SEED_PASSWORD;
export const ADMIN_WRITES = process.env.E2E_ALLOW_ADMIN_WRITES === "1";

export const EMAILS = {
  worker: "worker@plantx.demo",
  contractor: "contractor@plantx.demo",
  supervisor: "supervisor@plantx.demo",
  manager: "manager@plantx.demo",
} as const;
export type Who = keyof typeof EMAILS;

/**
 * Skips the whole file, loudly, when no password is available. Every live describe block also
 * rejects the reports it created once it finishes (see `cleanupCreated`).
 */
export const describeLive: typeof describe = ((name: string, fn: () => void) => {
  if (!PASSWORD) {
    describe(`${name} (SKIPPED: set E2E_PASSWORD to the seed password)`, () => {
      it.skip("needs E2E_PASSWORD", () => undefined);
    });
    return;
  }
  describe(name, () => {
    fn();
    afterAll(cleanupCreated);
  });
}) as typeof describe;

/** Unique per run, so reports from earlier runs never cluster with this one. */
export const RUN = Math.random().toString(36).slice(2, 8);
export const words = () =>
  Array.from({ length: 10 }, () => `w${Math.random().toString(36).slice(2, 8)}`).join(" ");

const tokens = new Map<Who, { token: string; id: string }>();
/** The identity the app's HTTP client is currently using (null = anonymous). */
let current: Who | null = null;

/** Sign in once per role and switch the app's HTTP client to that person. */
export async function as(who: Who) {
  let entry = tokens.get(who);
  if (!entry) {
    const login = await authApi.login({ email: EMAILS[who], password: PASSWORD as string });
    entry = { token: login.accessToken, id: login.user.id };
    tokens.set(who, entry);
  }
  authBridge.setToken(entry.token);
  current = who;
  return entry.id;
}

export const anonymous = () => {
  authBridge.setToken(null);
  current = null;
};

/** Solid grey PNG. 200x200 because Rekognition rejects images under 64x64. */
export function makePng(width = 200, height = 200): Blob {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]);
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: height }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return new Blob([new Uint8Array(png)], { type: "image/png" });
}

/** The WAV the app itself records: 16 kHz mono 16-bit PCM, a 2 s tone. */
export function makeWav(seconds = 2): Blob {
  const rate = 16_000;
  const samples = new Float32Array(seconds * rate).map(
    (_, i) => 0.1 * Math.sin((2 * Math.PI * 440 * i) / rate),
  );
  return new Blob([encodeWav(samples, rate)], { type: "audio/wav" });
}

/**
 * Uploads are owned by whoever uploads them, and only the owner can attach the key to a report,
 * so name the uploader explicitly instead of relying on whichever role signed in last.
 */
export async function uploadPhoto(who: Who) {
  await as(who);
  return uploadFile({ blob: makePng(), kind: "photo", contentType: "image/png" });
}
export async function uploadAudio(who: Who) {
  await as(who);
  return uploadFile({ blob: makeWav(), kind: "audio", contentType: "audio/wav" });
}

export function newSubmissionId(): string {
  return randomUUID();
}

/** Submit a report as `who`; the body is built the way the app builds it. */
export async function report(who: Who, over: Partial<SubmitIncidentInput> = {}) {
  await as(who);
  const result = await incidentsApi.submit({
    clientSubmissionId: newSubmissionId(),
    severity: "MEDIUM",
    title: `E2E ${RUN} ${words()}`,
    ...over,
  });
  track(result.incident);
  return result;
}

/**
 * Reports created by this run. The duplicate detector compares every new report with all OPEN
 * root reports from the last 30 days, and the semantic model rates random test words as near
 * identical, so test reports left open would be auto-linked under by later runs (and by later
 * files in the same run). Each describeLive block therefore takes what it created out of the active
 * set: open reports are rejected, and a report with an unfinished action has that action finished
 * (it becomes RESOLVED, since ACTION_ASSIGNED can't be rejected).
 */
const created = new Set<string>();
export const track = (incident: { id: string }) => {
  created.add(incident.id);
  record("incident", incident.id);
};

/**
 * Appends a created entity to the run manifest. The global teardown deletes exactly these rows
 * from the database after the run (e2e/purge.js), so the database ends as it started.
 */
function record(kind: "incident" | "user" | "blueprint", id: string) {
  const file = process.env.E2E_MANIFEST;
  if (file) appendFileSync(file, `${JSON.stringify({ kind, id })}\n`);
}
export const trackUser = (user: { id: string }) => record("user", user.id);
export const trackBlueprint = (blueprint: { id: string }) => record("blueprint", blueprint.id);

const REJECTABLE = new Set(["OPEN", "VALIDATED", "APPROVED"]);

/** As staff: finish the report's live action (milestones in order, or the one-off call). */
async function finishActiveAction(incidentId: string) {
  const live = await actionsApi.list({ incidentId, status: "OPEN,IN_PROGRESS", limit: 10 });
  for (const summary of live) {
    const action = await actionsApi.get(summary.id);
    const pending = (action.milestones ?? []).filter((m) => !m.completedAt);
    if (pending.length === 0) await actionsApi.complete(action.id);
    for (const milestone of pending.sort((a, b) => a.seq - b.seq)) {
      await actionsApi.completeMilestone(action.id, milestone.id);
    }
  }
}

export async function cleanupCreated() {
  if (created.size === 0) return;
  const restore = current;
  const failed: string[] = [];
  await as("supervisor");
  for (const id of created) {
    try {
      const incident = await incidentsApi.get(id);
      if (REJECTABLE.has(incident.status)) {
        await incidentsApi.transition(id, {
          event: "reject",
          expectedVersion: incident.version,
          note: `E2E cleanup (run ${RUN}): test data`,
        });
      } else if (incident.status === "ACTION_ASSIGNED") {
        await finishActiveAction(id);
      }
    } catch (error) {
      failed.push(`${id}: ${(error as Error).message}`);
    }
  }
  created.clear();
  if (restore) await as(restore);
  else anonymous();
  // Reported as its own afterAll error, so it never hides or changes the tests' own results.
  if (failed.length > 0) throw new Error(`E2E cleanup could not retire:\n${failed.join("\n")}`);
}

/**
 * Tests that need a stand-alone report call this: if the duplicate detector linked it under another
 * open report (random test words look alike to the semantic model), a supervisor unlinks it.
 * Keeps the caller's identity.
 */
export async function asRoot(incident: Incident): Promise<Incident> {
  if (!incident.cluster.isDuplicate) return incident;
  const restore = current;
  await as("supervisor");
  const root = await incidentsApi.uncluster(incident.id, { expectedVersion: incident.version });
  if (restore) await as(restore);
  return root;
}

/** Every role can read blueprints, so this keeps the caller's identity (worker if anonymous). */
export async function defaultBlueprint() {
  if (!current) await as("worker");
  const list = await blueprintsApi.list();
  const bp = list.find((b) => b.isDefault) ?? list[0];
  if (!bp) throw new Error("the API has no blueprint");
  return blueprintsApi.get(bp.id);
}

export const statusOf = async (id: string, who: Who = "manager") => {
  await as(who);
  return (await incidentsApi.get(id)).status;
};

/** Run `fn` and return the ApiError it throws (fails the test if it succeeds). */
export async function failure(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (error) {
    return error as { status: number; code: string; message: string; details?: unknown };
  }
  throw new Error("expected the call to fail, but it succeeded");
}

export type { Incident };
