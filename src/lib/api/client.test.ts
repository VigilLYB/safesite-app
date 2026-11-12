import { z } from "zod";
import { authBridge } from "./auth-bridge";
import { request } from "./client";
import { ApiError, userMessage } from "./errors";
import { endpoints } from "./registry";

const schema = z.object({ ok: z.boolean() });
const json = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  authBridge.setToken("token-1");
  authBridge.setUnauthorizedHandler(null);
});

describe("api client", () => {
  it("sends the bearer token and parses the response", async () => {
    fetchMock.mockReturnValueOnce(json(200, { ok: true }));
    await expect(request({ endpoint: endpoints.health, schema })).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test.invalid/health");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-1");
  });

  it("skips empty query values and encodes the rest", async () => {
    fetchMock.mockReturnValueOnce(json(200, { ok: true }));
    await request({
      endpoint: endpoints.incidents,
      schema,
      query: { status: "OPEN,VALIDATED", cursor: undefined, mine: true, x: "" },
    });
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(
      "https://api.test.invalid/v1/incidents?status=OPEN%2CVALIDATED&mine=true",
    );
  });

  it("signs out once when several calls get 401", async () => {
    const handler = jest.fn();
    authBridge.setUnauthorizedHandler(handler);
    fetchMock.mockImplementation(() =>
      json(401, { error: { code: "UNAUTHORIZED", message: "no" } }),
    );
    const calls = [1, 2, 3].map(() =>
      request({ endpoint: endpoints.me, schema }).catch((error: unknown) => error),
    );
    const errors = await Promise.all(calls);
    expect(handler).toHaveBeenCalledTimes(1);
    expect((errors[0] as ApiError).kind).toBe("unauthorized");
  });

  it("does not sign out on a wrong password (auth: false)", async () => {
    const handler = jest.fn();
    authBridge.setUnauthorizedHandler(handler);
    fetchMock.mockReturnValueOnce(
      json(401, { error: { code: "INVALID_CREDENTIALS", message: "bad" } }),
    );
    await expect(
      request({ endpoint: endpoints.login, schema, auth: false, body: {} }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(handler).not.toHaveBeenCalled();
    expect(authBridge.getToken()).toBe("token-1");
  });

  it("keeps network failure, 404 and 5xx distinct", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    await expect(request({ endpoint: endpoints.me, schema })).rejects.toMatchObject({
      kind: "network",
      code: "NETWORK_ERROR",
    });
    fetchMock.mockReturnValueOnce(json(404, { error: { code: "NOT_FOUND", message: "x" } }));
    await expect(request({ endpoint: endpoints.me, schema })).rejects.toMatchObject({
      kind: "notFound",
    });
    fetchMock.mockReturnValueOnce(
      Promise.resolve(new Response("<html>bad gateway</html>", { status: 502 })),
    );
    await expect(request({ endpoint: endpoints.me, schema })).rejects.toMatchObject({
      kind: "server",
      code: "HTTP_502",
    });
  });

  it("surfaces STALE_VERSION and the correlation id", async () => {
    fetchMock.mockReturnValueOnce(
      json(409, { error: { code: "STALE_VERSION", message: "old", correlationId: "abc" } }),
    );
    const error = (await request({ endpoint: endpoints.me, schema }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.code).toBe("STALE_VERSION");
    expect(error.correlationId).toBe("abc");
    expect(userMessage(error)).toMatch(/changed this report|Someone else/i);
  });

  it("rejects a response that does not match the schema without leaking it", async () => {
    fetchMock.mockReturnValueOnce(json(200, { ok: "yes" }));
    const error = (await request({ endpoint: endpoints.me, schema }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.code).toBe("RESPONSE_INVALID");
    expect(userMessage(error)).not.toMatch(/yes/);
  });

  it("never shows SQL or stack traces to people", () => {
    const error = new ApiError({
      status: 400,
      code: "X",
      message: "SELECT * FROM users WHERE id = 1",
      kind: "validation",
    });
    expect(userMessage(error)).toBe("That request could not be completed.");
  });
});
