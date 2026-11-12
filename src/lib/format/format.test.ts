import { setClock, systemClock } from "@/lib/clock";
import {
  EMPTY,
  formatCount,
  formatDateTime,
  formatDuration,
  formatPercent,
  formatRelative,
  humanize,
  shortId,
} from "./index";

afterEach(() => setClock(systemClock));

describe("format", () => {
  it("renders unknown values as an em dash, never 0", () => {
    expect(formatCount(null)).toBe(EMPTY);
    expect(formatCount(undefined)).toBe(EMPTY);
    expect(formatCount(Number.NaN)).toBe(EMPTY);
    expect(formatDuration(null)).toBe(EMPTY);
    expect(formatPercent(undefined)).toBe(EMPTY);
    expect(formatDateTime(null)).toBe(EMPTY);
    expect(formatDateTime("not a date")).toBe(EMPTY);
  });

  it("keeps a real zero", () => {
    expect(formatCount(0)).toBe("0");
  });

  it("formats durations by size", () => {
    expect(formatDuration(0.5)).toBe("30 min");
    expect(formatDuration(3.24)).toBe("3.2 h");
    expect(formatDuration(72)).toBe("3 d");
  });

  it("pins the time zone so the same instant reads the same everywhere", () => {
    // 2026-11-12T08:30:00Z is 14:00 in India
    expect(formatDateTime("2026-11-12T08:30:00Z")).toMatch(/2:00\s?pm/i);
  });

  it("formats relative time from the injected clock", () => {
    setClock({
      now: () => new Date("2026-11-12T10:00:00Z"),
      nowMs: () => Date.parse("2026-11-12T10:00:00Z"),
    });
    expect(formatRelative("2026-11-12T09:55:00Z")).toBe("5 min ago");
    expect(formatRelative("2026-11-12T07:00:00Z")).toBe("3 h ago");
    expect(formatRelative("2026-11-12T10:00:00Z")).toBe("just now");
  });

  it("humanizes enums and short ids", () => {
    expect(humanize("ACTION_ASSIGNED")).toBe("Action assigned");
    expect(shortId("3f1c2a9e-6d7b-4b8a-9f0e-1a2b3c4d5e6f")).toBe("HZ-3F1C2A9E");
  });
});
