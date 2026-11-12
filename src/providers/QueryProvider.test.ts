import { ApiError } from "@/lib/api";
import { queryClient, shouldRetry } from "./QueryProvider";

const apiError = (status: number) =>
  new ApiError({ status, code: "X", message: "m", kind: "unknown" });

describe("query defaults", () => {
  it("never retries a 4xx, retries other failures once", () => {
    expect(shouldRetry(0, apiError(404))).toBe(false);
    expect(shouldRetry(0, apiError(409))).toBe(false);
    expect(shouldRetry(0, apiError(503))).toBe(true);
    expect(shouldRetry(1, apiError(503))).toBe(false);
    expect(shouldRetry(0, new Error("boom"))).toBe(true);
  });

  it("never auto-retries mutations", () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
