import { isExpired, type Session } from "./session-storage";

const session = (expiresAt: string): Session => ({
  accessToken: "t",
  expiresAt,
  user: { id: "u", email: "a@b.co", fullName: "A", role: "WORKER", isActive: true, createdAt: "x" },
});

describe("isExpired", () => {
  const now = Date.parse("2026-11-12T10:00:00Z");
  it("treats a past or unparsable expiry as expired (deny by default)", () => {
    expect(isExpired(session("2026-11-12T09:59:59Z"), now)).toBe(true);
    expect(isExpired(session("garbage"), now)).toBe(true);
  });
  it("accepts a future expiry", () => {
    expect(isExpired(session("2026-11-12T10:00:01Z"), now)).toBe(false);
  });
});
