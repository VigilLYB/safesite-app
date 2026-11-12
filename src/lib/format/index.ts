import { config } from "@/lib/config";
import { clock } from "@/lib/clock";

/** All user-facing date, number and unit formatting lives here. Unknown renders as "—", never 0. */
export const EMPTY = "—";

const dateTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: config.APP_TIME_ZONE,
});
const dateOnly = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: config.APP_TIME_ZONE,
});
const timeOnly = new Intl.DateTimeFormat("en-IN", {
  timeStyle: "short",
  timeZone: config.APP_TIME_ZONE,
});
const integer = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? dateTime.format(date) : EMPTY;
}

export function formatDate(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? dateOnly.format(date) : EMPTY;
}

export function formatTime(value: string | null | undefined): string {
  const date = toDate(value);
  return date ? timeOnly.format(date) : EMPTY;
}

export function formatCount(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? integer.format(value) : EMPTY;
}

/** Hours to a short human string: "45 min", "3.2 h", "2.5 d". */
export function formatDuration(hours: number | null | undefined): string {
  if (typeof hours !== "number" || !Number.isFinite(hours)) return EMPTY;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${oneDecimal.format(hours)} h`;
  return `${oneDecimal.format(hours / 24)} d`;
}

export function formatPercent(ratio: number | null | undefined): string {
  return typeof ratio === "number" && Number.isFinite(ratio)
    ? `${integer.format(ratio * 100)}%`
    : EMPTY;
}

/** "5 min ago", "2 h ago", then a date. */
export function formatRelative(value: string | null | undefined): string {
  const date = toDate(value);
  if (!date) return EMPTY;
  const minutes = Math.round((clock.nowMs() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return formatDate(value);
}

/** Uppercase enum to sentence case: ACTION_ASSIGNED -> "Action assigned". */
export function humanize(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Short id for display: "HZ-3F1C2A9E". */
export function shortId(id: string): string {
  return `HZ-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}
