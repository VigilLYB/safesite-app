import { anonymous, as, describeLive, EMAILS, failure, PASSWORD } from "./support";
import { rawRequest, endpoints } from "./raw";
import { analyticsApi, authApi, blueprintsApi, incidentsApi, usersApi } from "@/lib/api";

describeLive("LIVE auth + RBAC at the API edge", () => {
  it("all four seeded accounts sign in with the right role", async () => {
    const roles = {
      worker: "WORKER",
      contractor: "WORKER",
      supervisor: "SUPERVISOR",
      manager: "MANAGER",
    } as const;
    for (const [who, role] of Object.entries(roles) as [keyof typeof EMAILS, string][]) {
      const login = await authApi.login({ email: EMAILS[who], password: PASSWORD as string });
      expect(login.user.role).toBe(role);
      expect(login.user.isActive).toBe(true);
      expect(Date.parse(login.expiresAt)).toBeGreaterThan(Date.now());
    }
  });

  it("wrong credentials are 401 and indistinguishable for an unknown account", async () => {
    anonymous();
    const wrong = await failure(() =>
      authApi.login({ email: EMAILS.worker, password: "definitely-wrong-1" }),
    );
    const unknown = await failure(() =>
      authApi.login({ email: "nobody@plantx.demo", password: "definitely-wrong-1" }),
    );
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.message).toBe(unknown.message);
  });

  it("no token is 401 everywhere", async () => {
    anonymous();
    expect((await failure(() => authApi.me())).status).toBe(401);
    expect((await failure(() => incidentsApi.list({}))).status).toBe(401);
  });

  it("/auth/me returns the signed-in user", async () => {
    await as("supervisor");
    const me = await authApi.me();
    expect(me).toMatchObject({ email: EMAILS.supervisor, role: "SUPERVISOR", isActive: true });
  });

  it("workers are forbidden from staff endpoints (403, not 404)", async () => {
    await as("worker");
    expect((await failure(() => usersApi.list())).status).toBe(403);
    expect((await failure(() => analyticsApi.summary({}))).status).toBe(403);
    // The role check runs before the lookup, so even a non-existent id is 403 for a worker.
    expect(
      (await failure(() => incidentsApi.similar("00000000-0000-4000-8000-000000000000"))).status,
    ).toBe(403);
  });

  it("supervisors can read users but only managers can create them or blueprints", async () => {
    await as("supervisor");
    expect((await usersApi.list()).length).toBeGreaterThan(0);
    expect(
      (
        await failure(() =>
          usersApi.create({
            email: "x@plantx.demo",
            fullName: "X",
            role: "WORKER",
            password: "long-enough-pw",
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await failure(() => blueprintsApi.create({ name: "nope", widthPx: 10, heightPx: 10 })))
        .status,
    ).toBe(403);
  });

  it("every role can read blueprints and areas", async () => {
    for (const who of ["worker", "supervisor", "manager"] as const) {
      await as(who);
      const list = await blueprintsApi.list();
      expect(list.length).toBeGreaterThan(0);
      const detail = await blueprintsApi.get((list.find((b) => b.isDefault) ?? list[0])!.id);
      expect(detail.areas.length).toBeGreaterThan(0);
    }
  });

  it("strict schemas: an unknown key is 400 VALIDATION_FAILED", async () => {
    await as("worker");
    const e = await failure(() =>
      rawRequest(endpoints.incidentSubmit, {
        clientSubmissionId: "3f1c2a9e-1111-4222-8333-444455556666",
        title: "x",
        status: "APPROVED",
      }),
    );
    expect(e.status).toBe(400);
    expect(e.code).toBe("VALIDATION_FAILED");
  });
});
