import { filterUsers, generatePassword } from "./password";

jest.mock("expo-crypto", () => ({
  getRandomBytes: (n: number) => Uint8Array.from({ length: n }, (_, i) => i * 7),
}));

const users = [
  { fullName: "Ravi Kumar", email: "ravi@x.io", role: "WORKER" },
  { fullName: "Anita Desai", email: "anita@x.io", role: "SUPERVISOR" },
];
describe("team", () => {
  it("filters by role tab and search", () => {
    expect(filterUsers(users, "WORKER", "")).toHaveLength(1);
    expect(filterUsers(users, "all", "ANITA@")).toHaveLength(1);
    expect(filterUsers(users, "MANAGER", "")).toHaveLength(0);
  });
  it("generates a password the server accepts (10–200 chars)", () => {
    const p = generatePassword();
    expect(p.length).toBeGreaterThanOrEqual(10);
    expect(p.length).toBeLessThanOrEqual(200);
  });
});
