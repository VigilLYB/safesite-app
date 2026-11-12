import { changedFieldGroups } from "./labels";
import { ApiError, fieldErrors, validateUpload } from "@/lib/api";
import { toApiError } from "@/lib/api/client-errors";

describe("changedFieldGroups", () => {
  it("shows each group once", () => {
    expect(changedFieldGroups(["pinX", "pinY", "areaId", "gpsLat", "severity", "unknown"])).toEqual(
      ["Location", "GPS fix", "Severity"],
    );
  });
});

describe("error shapes", () => {
  it("parses the API envelope", () => {
    const e = toApiError(409, {
      error: {
        code: "STALE_VERSION",
        message: "m",
        correlationId: "c1",
        details: { expectedVersion: 1, currentVersion: 2 },
      },
    });
    expect([e.code, e.correlationId, e.kind]).toEqual(["STALE_VERSION", "c1", "conflict"]);
  });
  it("parses API Gateway's { message } for throttling and timeouts", () => {
    expect(toApiError(429, { message: "Too Many Requests" }, "cid").code).toBe("THROTTLED");
    expect(toApiError(504, { message: "Endpoint request timed out" }).code).toBe("GATEWAY_TIMEOUT");
    expect(toApiError(500, undefined, "cid").correlationId).toBe("cid");
  });
  it("maps VALIDATION_FAILED details to fields", () => {
    const e = new ApiError({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "x",
      kind: "validation",
      details: [{ path: ["location", "gps", "lat"], message: "bad" }],
    });
    expect(fieldErrors(e)).toEqual({ "location.gps.lat": "bad" });
    const b = new ApiError({
      status: 400,
      code: "VALIDATION_FAILED",
      message: "Nothing to change",
      kind: "validation",
    });
    expect(fieldErrors(b)).toEqual({ _form: "Nothing to change" });
  });
});

describe("upload rules", () => {
  it("rejects m4a/AAC/WebM audio and oversize files", () => {
    expect(validateUpload({ kind: "audio", contentType: "audio/mp4", sizeBytes: 10 })).toMatch(
      /WAV/,
    );
    expect(
      validateUpload({ kind: "audio", contentType: "audio/webm", sizeBytes: 10 }),
    ).not.toBeNull();
    expect(
      validateUpload({ kind: "audio", contentType: "audio/wav", sizeBytes: 4_194_305 }),
    ).toMatch(/too large/);
    expect(validateUpload({ kind: "audio", contentType: "AUDIO/WAV", sizeBytes: 100 })).toBeNull();
    expect(
      validateUpload({ kind: "photo", contentType: "image/heic", sizeBytes: 10 }),
    ).not.toBeNull();
    expect(
      validateUpload({ kind: "blueprint", contentType: "image/svg+xml", sizeBytes: 10 }),
    ).toBeNull();
  });
});
