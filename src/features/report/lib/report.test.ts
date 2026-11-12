import { ApiError, type SubmitIncidentResponse } from "@/lib/api";
import { buildLocation, buildSubmitBody, hasContent } from "./body";
import { missingUploadKind, SavedOnDevice, submitWithRecovery, type SubmitDeps } from "./submit";

const base = {
  clientSubmissionId: "3f1c2a9e-1111-4222-8333-444455556666",
  severity: "MEDIUM" as const,
  category: "",
  title: "",
  description: "",
  pin: null,
  gps: null,
  custom: {},
};
const ok = {
  incident: { id: "i" },
  replayed: false,
  ai: null,
} as unknown as SubmitIncidentResponse;
const net = () => new ApiError({ status: 0, code: "NETWORK_ERROR", message: "x", kind: "network" });
const upNotFound = (what: string) =>
  new ApiError({
    status: 422,
    code: "UNPROCESSABLE",
    message: `${what} upload not found; PUT the file before submitting`,
    kind: "validation",
  });

describe("report body", () => {
  it("location: GPS only / pin wins and keeps GPS / neither omits", () => {
    const gps = { lat: 19.1, lng: 72.8, accuracyM: 25 };
    expect(buildLocation(null, gps)).toEqual({ gps });
    expect(buildLocation({ blueprintId: "b", x: 1, y: 2 }, gps)).toEqual({
      blueprintId: "b",
      pin: { x: 1, y: 2 },
      gps,
    });
    expect(buildLocation({ blueprintId: "b", x: 1, y: 2 }, null)).toEqual({
      blueprintId: "b",
      pin: { x: 1, y: 2 },
    });
    expect(buildLocation(null, null)).toBeUndefined();
  });
  it("omits empty optionals and sends only listed fields", () => {
    const body = buildSubmitBody({ ...base, title: "  Leak ", description: "", custom: { a: "" } });
    expect(body).toEqual({
      clientSubmissionId: base.clientSubmissionId,
      severity: "MEDIUM",
      title: "Leak",
    });
    expect(Object.values(body)).not.toContain("");
  });
  it("needs a photo, voice note, title or description", () => {
    expect(hasContent({ hasPhoto: false, hasVoice: false, title: " ", description: "" })).toBe(
      false,
    );
    expect(hasContent({ hasPhoto: false, hasVoice: true, title: "", description: "" })).toBe(true);
  });
});

describe("submit recovery", () => {
  const mk = (
    submit: SubmitDeps["submit"],
    upload: SubmitDeps["upload"] = jest.fn().mockResolvedValue("k1"),
  ) => {
    const deps: SubmitDeps = {
      upload,
      submit,
      sleep: jest.fn().mockResolvedValue(undefined),
      nowMs: () => 0,
    };
    return deps;
  };
  const run = (deps: SubmitDeps, cache = new Map()) =>
    submitWithRecovery({
      photo: { uri: "p", contentType: "image/jpeg" },
      audio: null,
      cache,
      deps,
      build: (k) => buildSubmitBody({ ...base, title: "t", ...k }),
    });

  it("resends the IDENTICAL body (same clientSubmissionId) after ambiguous failures", async () => {
    const submit = jest
      .fn()
      .mockRejectedValueOnce(net())
      .mockRejectedValueOnce(net())
      .mockResolvedValueOnce(ok);
    const deps = mk(submit);
    await expect(run(deps)).resolves.toBe(ok);
    expect(submit).toHaveBeenCalledTimes(3);
    expect(submit.mock.calls[0][0]).toEqual(submit.mock.calls[2][0]);
    expect(deps.upload).toHaveBeenCalledTimes(1); // keys reused, no second upload
  });
  it("after two resends it is saved on the device", async () => {
    const submit = jest.fn().mockRejectedValue(net());
    await expect(run(mk(submit))).rejects.toBeInstanceOf(SavedOnDevice);
    expect(submit).toHaveBeenCalledTimes(3);
  });
  it("a missing upload is re-uploaded and the same body resent", async () => {
    const upload = jest.fn().mockResolvedValueOnce("k1").mockResolvedValueOnce("k2");
    const submit = jest.fn().mockRejectedValueOnce(upNotFound("photo")).mockResolvedValueOnce(ok);
    await run(mk(submit, upload));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(submit.mock.calls[1][0].photoKey).toBe("k2");
    expect(submit.mock.calls[1][0].clientSubmissionId).toBe(base.clientSubmissionId);
  });
  it("never retries a 400", async () => {
    const bad = new ApiError({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "x",
      kind: "validation",
    });
    const submit = jest.fn().mockRejectedValue(bad);
    await expect(run(mk(submit))).rejects.toBe(bad);
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it("identifies which upload is missing", () => {
    expect(missingUploadKind(upNotFound("audio"))).toBe("audio");
    expect(missingUploadKind(net())).toBeNull();
  });
});
