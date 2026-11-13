/** Plain "YYYY-MM-DD" calendar-day helpers shared by the date pickers (no time zones involved). */
export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const parts = (ymd: string) => ymd.split("-").map(Number) as [number, number, number];
export const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const shift = (day: string, days: number) => {
  const [y, m, d] = parts(day);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
};
/** "12 Nov". */
export const short = (day: string) => {
  const [, m, d] = parts(day);
  return `${d} ${MONTHS[m - 1]}`;
};
export const isDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

/** Monday-first grid of one month: leading blanks, then the days. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => ymd(year, month, i + 1)),
  ];
}
