import { authApi, authBridge, healthApi, incidentsApi } from "@/lib/api";
import { endpoints } from "@/lib/api/registry";
import { rawRequest } from "./raw";
import { anonymous, failure } from "./support";

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL as string;

/** Needs no credentials: proves the hosted API is reachable and honours the contract the app relies on. */
describe("LIVE public surface (no credentials)", () => {
  beforeEach(anonymous);

  it("health reports the database and the AI provider (the demo-mode banner depends on this)", async () => {
    const health = await healthApi.get();
    expect(health.status).toBe("ok");
    expect(health.database).toBe("ok");
    expect(["aws", "mock"]).toContain(health.aiProvider);
  });

  it("every endpoint the app calls exists in the LIVE OpenAPI document", async () => {
    const spec = (await (await fetch(`${BASE}/openapi.json`)).json()) as {
      paths: Record<string, Record<string, unknown>>;
    };
    for (const [name, endpoint] of Object.entries(endpoints)) {
      if (endpoint.template === "/health") continue; // not part of the OpenAPI document
      const operation = spec.paths[endpoint.template]?.[endpoint.method.toLowerCase()];
      expect([name, Boolean(operation)]).toEqual([name, true]);
    }
  });

  it("Swagger docs are served", async () => {
    expect((await fetch(`${BASE}/docs`)).status).toBe(200);
  });

  it("login with bad credentials is a 401 error envelope with a correlation id", async () => {
    const e = await failure(() =>
      authApi.login({ email: "worker@plantx.demo", password: "definitely-wrong-1" }),
    );
    expect(e.status).toBe(401);
    expect(e).toMatchObject({ code: "UNAUTHORIZED" });
    expect((e as { correlationId?: string }).correlationId).toBeTruthy();
  });

  it("login is strict: an unknown key is 400 VALIDATION_FAILED", async () => {
    const e = await failure(() =>
      rawRequest(endpoints.login, { email: "a@b.co", password: "x", extra: 1 }),
    );
    expect(e.status).toBe(400);
    expect(e.code).toBe("VALIDATION_FAILED");
  });

  it("an authenticated route without a token is 401 and does NOT trigger the sign-out bridge twice", async () => {
    const handler = jest.fn();
    authBridge.setUnauthorizedHandler(handler);
    authBridge.setToken("not-a-real-token");
    const first = await failure(() => incidentsApi.list({}));
    const second = await failure(() => incidentsApi.list({}));
    expect([first.status, second.status]).toEqual([401, 401]);
    expect(handler).toHaveBeenCalledTimes(1); // single-flight
    authBridge.setUnauthorizedHandler(null);
  });

  it("a malformed token is 401, not 500", async () => {
    authBridge.setToken("a.b.c");
    expect((await failure(() => incidentsApi.list({}))).status).toBe(401);
    authBridge.setToken(null);
  });
});
