import { authApi, blueprintsApi, usersApi } from "@/lib/api";
import { ADMIN_WRITES, as, describeLive, failure, RUN } from "./support";

/**
 * Create-only endpoints: the API has no delete, so every run leaves a user and a blueprint behind.
 * Opt in with E2E_ALLOW_ADMIN_WRITES=1.
 */
const gated = ADMIN_WRITES
  ? describeLive
  : (name: string, fn: () => void) => {
      describe(`${name} (SKIPPED: set E2E_ALLOW_ADMIN_WRITES=1; these rows are permanent)`, () =>
        it.skip("opt-in", fn));
    };

gated("LIVE manager administration", () => {
  const email = `e2e.${RUN}@plantx.demo`;

  it("creates a user, who can sign in; the same email again is 409", async () => {
    await as("manager");
    const created = await usersApi.create({
      email: email.toUpperCase(),
      fullName: `E2E ${RUN}`,
      role: "WORKER",
      password: "temporary-pass-123",
    });
    expect(created.email).toBe(email); // stored lowercase
    expect(created.isActive).toBe(true);
    expect(
      (
        await failure(() =>
          usersApi.create({
            email,
            fullName: "Again",
            role: "WORKER",
            password: "temporary-pass-123",
          }),
        )
      ).status,
    ).toBe(409);
    expect((await usersApi.list("WORKER")).some((u) => u.email === email)).toBe(true);
    const login = await authApi.login({ email, password: "temporary-pass-123" });
    expect(login.user.role).toBe("WORKER");
  });

  it("rejects a short password", async () => {
    await as("manager");
    expect(
      (
        await failure(() =>
          usersApi.create({
            email: `x.${RUN}@plantx.demo`,
            fullName: "X",
            role: "WORKER",
            password: "short",
          }),
        )
      ).status,
    ).toBe(400);
  });

  it("creates a non-default blueprint and an area inside it; a duplicate area name is 409; a point outside is 400", async () => {
    await as("manager");
    const bp = await blueprintsApi.create({
      name: `E2E plan ${RUN}`,
      widthPx: 1000,
      heightPx: 800,
      isDefault: false,
    });
    expect(bp.areas).toEqual([]);
    expect(
      (
        await failure(() =>
          blueprintsApi.create({ name: `E2E plan ${RUN}`, widthPx: 10, heightPx: 10 }),
        )
      ).status,
    ).toBe(409);
    const area = await blueprintsApi.addArea(bp.id, {
      name: "Dock",
      polygon: [
        [0, 0],
        [100, 0],
        [100, 100],
      ],
    });
    expect(area.name).toBe("Dock");
    expect(
      (
        await failure(() =>
          blueprintsApi.addArea(bp.id, {
            name: "Dock",
            polygon: [
              [0, 0],
              [100, 0],
              [100, 100],
            ],
          }),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await failure(() =>
          blueprintsApi.addArea(bp.id, {
            name: "Far",
            polygon: [
              [0, 0],
              [5000, 0],
              [100, 100],
            ],
          }),
        )
      ).status,
    ).toBe(400);
    expect((await blueprintsApi.get(bp.id)).areas.map((a) => a.name)).toEqual(["Dock"]);
  });
});
