import type { AnalyticsFilters, Severity } from "@/lib/api";
import { lastDays, toApiRange, YMD, type DayRange } from "@/lib/plant-time";
import { isUuid } from "@/lib/validation";

export type Shift = "A" | "B" | "C";
const SEVERITIES: readonly Severity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export interface AnalyticsState extends DayRange {
  shift?: Shift | undefined;
  severity?: Severity | undefined;
  activeOnly?: boolean | undefined;
  blueprintId?: string | undefined;
  cellSize: number;
}

type Raw = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export const DEFAULT_CELL = 50;
export const clampCell = (value: number): number => Math.min(500, Math.max(10, Math.round(value)));

/** Parse URL state; invalid values are dropped and the range defaults to the last 30 days. */
export function parseAnalyticsParams(raw: Raw): AnalyticsState {
  const def = lastDays(30);
  const day = (v: string | undefined) =>
    v && YMD.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
  let fromDay = day(first(raw.from)) ?? def.fromDay;
  let toDay = day(first(raw.to)) ?? def.toDay;
  if (fromDay > toDay) {
    fromDay = def.fromDay;
    toDay = def.toDay;
  }
  const shift = ["A", "B", "C"].find((s) => s === first(raw.shift)) as Shift | undefined;
  const severity = SEVERITIES.find((s) => s === first(raw.severity));
  const blueprint = first(raw.blueprintId);
  const cell = Number(first(raw.cellSize));
  return {
    fromDay,
    toDay,
    shift,
    severity,
    activeOnly: first(raw.activeOnly) === "true" ? true : undefined,
    blueprintId: blueprint && isUuid(blueprint) ? blueprint : undefined,
    cellSize: Number.isFinite(cell) && cell > 0 ? clampCell(cell) : DEFAULT_CELL,
  };
}

/** `to` is exclusive: the start of the day after the last selected day, in plant time. */
export function toAnalyticsFilters(state: AnalyticsState): AnalyticsFilters {
  const { from, to } = toApiRange(state);
  return {
    from,
    to,
    shift: state.shift,
    severity: state.severity,
    activeOnly: state.activeOnly ? true : undefined,
    blueprintId: state.blueprintId,
  };
}

export function toUrl(state: AnalyticsState): Record<string, string | undefined> {
  const def = lastDays(30);
  const isDefaultRange = state.fromDay === def.fromDay && state.toDay === def.toDay;
  return {
    from: isDefaultRange ? undefined : state.fromDay,
    to: isDefaultRange ? undefined : state.toDay,
    shift: state.shift,
    severity: state.severity,
    activeOnly: state.activeOnly ? "true" : undefined,
    blueprintId: state.blueprintId,
    cellSize: state.cellSize === DEFAULT_CELL ? undefined : String(state.cellSize),
  };
}

/** Fill missing buckets with 0 in a fixed order, so every status / severity / shift is shown. */
export function fillBuckets<T extends { key: string; count: number }>(
  order: readonly string[],
  buckets: readonly T[],
): { key: string; count: number }[] {
  return order.map((key) => ({
    key,
    count: buckets.find((bucket) => bucket.key === key)?.count ?? 0,
  }));
}

/** Where a status count should send the viewer in the incidents list. */
export const STATUS_TAB: Record<string, string> = {
  OPEN: "triage",
  VALIDATED: "validated",
  APPROVED: "needs-action",
  ACTION_ASSIGNED: "in-progress",
  RESOLVED: "closure",
  CLOSED: "closed",
  REJECTED: "rejected",
};
