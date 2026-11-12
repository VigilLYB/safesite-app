import { randomUUID } from "node:crypto";
import { crc32, deflateSync } from "node:zlib";
import {
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

/** Skips the whole file, loudly, when no password is available. */
export const describeLive: typeof describe = ((name: string, fn: () => void) => {
  if (!PASSWORD) {
    describe(`${name} (SKIPPED: set E2E_PASSWORD to the seed password)`, () => {
      it.skip("needs E2E_PASSWORD", () => undefined);
    });
    return;
  }
  describe(name, fn);
}) as typeof describe;

/** Unique per run, so reports from earlier runs never cluster with this one. */
export const RUN = Math.random().toString(36).slice(2, 8);
export const words = () =>
  Array.from({ length: 10 }, () => `w${Math.random().toString(36).slice(2, 8)}`).join(" ");

const tokens = new Map<Who, { token: string; id: string }>();

/** Sign in once per role and switch the app's HTTP client to that person. */
export async function as(who: Who) {
  let entry = tokens.get(who);
  if (!entry) {
    const login = await authApi.login({ email: EMAILS[who], password: PASSWORD as string });
    entry = { token: login.accessToken, id: login.user.id };
    tokens.set(who, entry);
  }
  authBridge.setToken(entry.token);
  return entry.id;
}

export const anonymous = () => authBridge.setToken(null);

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

export const uploadPhoto = () =>
  uploadFile({ blob: makePng(), kind: "photo", contentType: "image/png" });
export const uploadAudio = () =>
  uploadFile({ blob: makeWav(), kind: "audio", contentType: "audio/wav" });

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
  return result;
}

export async function defaultBlueprint() {
  await as("worker");
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
