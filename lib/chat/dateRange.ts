// Lenient natural-language date range parsing for the chat widget, so a
// guest typing "20-23 July" gets checked against the real calendar instead
// of just being logged as a raw string. Client-safe (no server-only import) —
// reuses the same date primitives the booking calendar uses.
import { addDays, toIsoDate, todayUtc } from "@/lib/booking/dates";

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export type DateRange = { checkIn: Date; checkOut: Date };

/** Push a year-less date into the future if it would otherwise be in the past. */
function resolveYear(monthIdx: number, day: number, today: Date): number {
  const thisYear = today.getUTCFullYear();
  const candidate = Date.UTC(thisYear, monthIdx, day);
  return candidate < today.getTime() ? thisYear + 1 : thisYear;
}

/** Parse things like "20-23 July", "July 20-23", "20/07-23/07", each with an optional year. */
export function parseHumanDateRange(text: string, today: Date = todayUtc()): DateRange | null {
  const t = text.trim().toLowerCase();

  // "20-23 July[ 2026]" / "20th to 23rd July"
  let m = t.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|—|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\.?\s*(\d{4})?/,
  );
  if (m) {
    const monthIdx = MONTHS[m[3]];
    if (monthIdx !== undefined) {
      const day1 = Number(m[1]);
      const day2 = Number(m[2]);
      const year = m[4] ? Number(m[4]) : resolveYear(monthIdx, day1, today);
      return buildRange(year, monthIdx, day1, day2);
    }
  }

  // "July 20-23[, 2026]"
  m = t.match(
    /([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:-|–|—|to)\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?/,
  );
  if (m) {
    const monthIdx = MONTHS[m[1]];
    if (monthIdx !== undefined) {
      const day1 = Number(m[2]);
      const day2 = Number(m[3]);
      const year = m[4] ? Number(m[4]) : resolveYear(monthIdx, day1, today);
      return buildRange(year, monthIdx, day1, day2);
    }
  }

  // "20/07-23/07[/2026]" or "20.07 to 23.07.2026" (UK day/month order)
  m = t.match(
    /(\d{1,2})[/.](\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?/,
  );
  if (m) {
    const day1 = Number(m[1]);
    const month1 = Number(m[2]) - 1;
    const day2 = Number(m[3]);
    const month2 = Number(m[4]) - 1;
    if (month1 === month2 && month1 >= 0 && month1 <= 11) {
      let year = m[5] ? Number(m[5]) : resolveYear(month1, day1, today);
      if (year < 100) year += 2000;
      return buildRange(year, month1, day1, day2);
    }
  }

  return null;
}

function buildRange(year: number, monthIdx: number, day1: number, day2: number): DateRange | null {
  if (day2 <= day1) return null;
  const checkIn = new Date(Date.UTC(year, monthIdx, day1));
  const checkOut = new Date(Date.UTC(year, monthIdx, day2));
  // Reject dates that rolled over (e.g. day 31 in a 30-day month)
  if (checkIn.getUTCMonth() !== monthIdx || checkOut.getUTCMonth() !== monthIdx) return null;
  return { checkIn, checkOut };
}

function nextWeekday(from: Date, targetDow: number, includeToday: boolean): Date {
  const diff = (targetDow - from.getUTCDay() + 7) % 7;
  return addDays(from, diff === 0 && !includeToday ? 7 : diff);
}

/** Concrete sample ranges for the quick-reply buttons — a well-defined guess, not a real pick. */
export function quickRange(kind: "weekend" | "nextweek" | "nextmonth", today: Date = todayUtc()): DateRange {
  if (kind === "weekend") {
    const checkIn = nextWeekday(today, 5, true); // Friday, today counts
    return { checkIn, checkOut: addDays(checkIn, 2) }; // Fri → Sun
  }
  if (kind === "nextweek") {
    const checkIn = nextWeekday(today, 1, false); // next Monday, not this week
    return { checkIn, checkOut: addDays(checkIn, 3) }; // Mon → Thu
  }
  const firstOfNextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return { checkIn: firstOfNextMonth, checkOut: addDays(firstOfNextMonth, 3) };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "20–23 July 2026" (or "20 July – 3 August 2026" across months). */
export function formatRange(checkIn: Date, checkOut: Date): string {
  const inMonth = checkIn.getUTCMonth();
  const outMonth = checkOut.getUTCMonth();
  const year = checkOut.getUTCFullYear();
  if (inMonth === outMonth) {
    return `${checkIn.getUTCDate()}–${checkOut.getUTCDate()} ${MONTH_NAMES[outMonth]} ${year}`;
  }
  return `${checkIn.getUTCDate()} ${MONTH_NAMES[inMonth]} – ${checkOut.getUTCDate()} ${MONTH_NAMES[outMonth]} ${year}`;
}

export { toIsoDate };
