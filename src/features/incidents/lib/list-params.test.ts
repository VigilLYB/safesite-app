import { effectiveRootsOnly, parseListParams, toApiFilters, toUrlParams } from "./list-params";

const ID = "3f1c2a9e-1111-4222-8333-444455556666";

describe("incident list params", () => {
  it("defaults the tab by role", () => {
    expect(parseListParams({}, "WORKER").tab).toBe("active");
    expect(parseListParams({}, "SUPERVISOR").tab).toBe("triage");
    expect(parseListParams({}, "MANAGER").tab).toBe("closure");
  });
  it("sends the exact status presets", () => {
    const f = (tab: string, role: "WORKER" | "SUPERVISOR") =>
      toApiFilters(parseListParams({ tab }, role), role).status;
    expect(f("active", "WORKER")).toBe("OPEN,VALIDATED,APPROVED,ACTION_ASSIGNED");
    expect(f("resolved", "WORKER")).toBe("RESOLVED,CLOSED");
    expect(f("all", "WORKER")).toBeUndefined();
    expect(f("needs-action", "SUPERVISOR")).toBe("APPROVED");
    expect(f("closure", "SUPERVISOR")).toBe("RESOLVED");
  });
  it("falls back when the tab doesn't exist for the role", () => {
    expect(parseListParams({ tab: "triage" }, "WORKER").tab).toBe("active");
  });
  it("triage hides duplicates by default; an explicit choice wins", () => {
    expect(toApiFilters(parseListParams({}, "SUPERVISOR"), "SUPERVISOR").rootsOnly).toBe(true);
    const off = parseListParams({ rootsOnly: "false" }, "SUPERVISOR");
    expect(effectiveRootsOnly(off)).toBe(false);
    expect(toApiFilters(off, "SUPERVISOR").rootsOnly).toBeUndefined();
  });
  it("never sends staff-only filters for a worker", () => {
    const state = parseListParams(
      { reporterId: ID, areaId: ID, blueprintId: ID, mine: "true", rootsOnly: "true" },
      "WORKER",
    );
    const filters = toApiFilters(state, "WORKER");
    for (const k of ["reporterId", "areaId", "blueprintId", "mine", "rootsOnly"] as const)
      expect(filters[k]).toBeUndefined();
  });
  it("drops invalid values", () => {
    const s = parseListParams(
      { severity: "EXTREME", reporterId: "nope", from: "2026-13-99", to: "x" },
      "SUPERVISOR",
    );
    expect([s.severity, s.reporterId, s.fromDay, s.toDay]).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
    const backwards = parseListParams({ from: "2026-11-12", to: "2026-11-01" }, "SUPERVISOR");
    expect([backwards.fromDay, backwards.toDay]).toEqual([undefined, undefined]);
  });
  it("converts days to plant-time instants with an exclusive end, caps limit at 25", () => {
    const f = toApiFilters(
      parseListParams({ from: "2026-11-01", to: "2026-11-12", severity: "HIGH" }, "SUPERVISOR"),
      "SUPERVISOR",
    );
    expect(f.from).toBe("2026-10-31T18:30:00.000Z");
    expect(f.to).toBe("2026-11-12T18:30:00.000Z");
    expect(f.limit).toBe(25);
    expect(f).not.toHaveProperty("cursor");
  });
  it("round-trips to URL params without the cursor", () => {
    const state = parseListParams({ tab: "closed", severity: "LOW" }, "MANAGER");
    expect(toUrlParams(state, "MANAGER")).toMatchObject({ tab: "closed", severity: "LOW" });
    expect(Object.keys(toUrlParams(state, "MANAGER"))).not.toContain("cursor");
  });
});
