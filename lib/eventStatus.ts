/** ISO date strings compare correctly with plain string comparison. */
export type EventStatus = "today" | "upcoming" | "past";

/** null when there's no date to judge — a mandapam-only listing with no
 * annadhanam date set. A listing can serve across a range of days (e.g.
 * "every day till the last day of the festival") instead of just one —
 * pass endDate for that; omitted or equal to startDate means a single day. */
export function getEventStatus(startDate: string | null, endDate?: string | null): EventStatus | null {
  if (!startDate) return null;
  const today = new Date().toISOString().slice(0, 10);
  const end = endDate || startDate;
  if (today < startDate) return "upcoming";
  if (today > end) return "past";
  return "today";
}

/** "Open" was misleading for a future-dated listing — it reads as "open
 * right now", not "scheduled". */
export function eventStatusLabel(status: EventStatus): string {
  if (status === "today") return "Serving Now";
  if (status === "upcoming") return "Upcoming";
  return "Past";
}

/** "21 Sept", for showing a single annadhanam date alongside its serving time. */
export function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** "21–25 Sept" for a multi-day range, or just "21 Sept" for a single day
 * (no end date, or an end date equal to the start). */
export function formatEventDateRange(startDate: string | null, endDate?: string | null): string {
  if (!startDate) return "";
  if (!endDate || endDate === startDate) return formatEventDate(startDate);

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return formatEventDate(startDate);

  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.getDate()}–${end.getDate()} ${end.toLocaleDateString("en-IN", { month: "short" })}`;
  }
  return `${formatEventDate(startDate)} – ${formatEventDate(endDate)}`;
}
