import { roleHome, roleLabel } from "./permissions";

describe("role routing", () => {
  it("sends each role to its own group", () => {
    expect(roleHome).toEqual({
      WORKER: "/(worker)",
      SUPERVISOR: "/(supervisor)",
      MANAGER: "/(manager)",
    });
    expect(Object.keys(roleLabel).sort()).toEqual(["MANAGER", "SUPERVISOR", "WORKER"]);
  });
});
