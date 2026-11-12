import { config } from "@/lib/config";
import { clock } from "@/lib/clock";

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function offsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

export const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** ISO instant of 00:00 plant time on a calendar day ("2026-11-12"). */
export function plantDayStartIso(ymd: string, timeZone: string = config.APP_TIME_ZONE): string {
  const match = YMD.exec(ymd);
  if (!match) throw new Error(`Bad date: ${ymd}`);
  const utcMidnight = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const guess = new Date(utcMidnight);
  const first = utcMidnight - offsetMs(guess, timeZone);
  const refined = utcMidnight - offsetMs(new Date(first), timeZone);
  return new Date(refined).toISOString();
}

/** Calendar day in plant time for an instant: "2026-11-12". */
export function plantDay(at: Date, timeZone: string = config.APP_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  return parts; // en-CA gives YYYY-MM-DD
}

export function addDays(ymd: string, days: number): string {
  const match = YMD.exec(ymd);
  if (!match) throw new Error(`Bad date: ${ymd}`);
  const ms = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export interface DayRange {
  /** First day, inclusive ("2026-10-14"). */
  fromDay: string;
  /** Last day, inclusive ("2026-11-12"). */
  toDay: string;
}

/** The last `days` days including today, in plant time (guide §4.8 default: 30). */
export function lastDays(days: number): DayRange {
  const today = plantDay(clock.now());
  return { fromDay: addDays(today, -(days - 1)), toDay: today };
}

/** API range: `from` = start of the first day, `to` = start of the day AFTER the last (exclusive). */
export function toApiRange(range: DayRange): { from: string; to: string } {
  return { from: plantDayStartIso(range.fromDay), to: plantDayStartIso(addDays(range.toDay, 1)) };
}

export const isValidRange = (range: DayRange): boolean =>
  YMD.test(range.fromDay) && YMD.test(range.toDay) && range.fromDay <= range.toDay;
