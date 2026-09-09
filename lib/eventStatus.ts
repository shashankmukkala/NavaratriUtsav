/** ISO date strings compare correctly with plain string comparison. */
export type EventStatus = "today" | "upcoming" | "past";

/** null when there's no date to judge — a mandapam-only listing with no
 * annadhanam date set. */
export function getEventStatus(dateStr: string | null): EventStatus | null {
  if (!dateStr) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr === today) return "today";
  return dateStr > today ? "upcoming" : "past";
}

/** "Open" was misleading for a future-dated listing — it reads as "open
 * right now", not "scheduled". */
export function eventStatusLabel(status: EventStatus): string {
  if (status === "today") return "Serving Now";
  if (status === "upcoming") return "Upcoming";
  return "Past";
}
