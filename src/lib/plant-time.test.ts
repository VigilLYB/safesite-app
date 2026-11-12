import { setClock } from "./clock";
import {
  addDays,
  isValidRange,
  lastDays,
  plantDay,
  plantDayStartIso,
  toApiRange,
} from "./plant-time";

describe("plant time (Asia/Kolkata)", () => {
  it("midnight IST is 18:30 UTC the day before", () => {
    expect(plantDayStartIso("2026-11-12", "Asia/Kolkata")).toBe("2026-11-11T18:30:00.000Z");
  });
  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("`to` is the start of the day AFTER the last selected day (exclusive)", () => {
    expect(toApiRange({ fromDay: "2026-11-01", toDay: "2026-11-12" })).toEqual({
      from: "2026-10-31T18:30:00.000Z",
      to: "2026-11-12T18:30:00.000Z",
    });
  });
  it("uses the plant day, not the UTC day", () => {
    expect(plantDay(new Date("2026-11-12T20:00:00Z"), "Asia/Kolkata")).toBe("2026-11-13");
  });
  it("defaults to the last N days including today", () => {
    setClock({
      now: () => new Date("2026-11-12T06:00:00Z"),
      nowMs: () => Date.parse("2026-11-12T06:00:00Z"),
    });
    expect(lastDays(30)).toEqual({ fromDay: "2026-10-14", toDay: "2026-11-12" });
  });
  it("validates ranges", () => {
    expect(isValidRange({ fromDay: "2026-11-13", toDay: "2026-11-12" })).toBe(false);
    expect(isValidRange({ fromDay: "2026-11-12", toDay: "2026-11-12" })).toBe(true);
  });
});
