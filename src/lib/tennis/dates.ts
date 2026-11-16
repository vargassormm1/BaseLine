import type { ISODate } from "./types";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const yearOf = (d: ISODate) => Number(d.slice(0, 4));
export function addDays(d: ISODate, n: number): ISODate {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
/** Today in the group's time zone (US Eastern), as YYYY-MM-DD. */
export function todayET(now = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
/** "Nov 16" this year, "Nov 16, 2024" otherwise. */
export function shortDate(d: ISODate, today: ISODate): string {
  const s = `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
  return d.slice(0, 4) === today.slice(0, 4) ? s : `${s}, ${d.slice(0, 4)}`;
}
export function relativeDay(d: ISODate, today: ISODate): string {
  if (d === today) return "Today";
  if (d === addDays(today, -1)) return "Yesterday";
  return shortDate(d, today);
}
