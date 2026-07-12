// Date-only helpers. All stay dates are calendar dates stored as Date objects
// at midnight UTC; check-out is always exclusive (a 20→23 stay = nights 20, 21, 22).

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Strictly parse "YYYY-MM-DD" to a UTC-midnight Date, or null if invalid. */
export function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Reject dates like 2026-02-31 that roll over
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today as a UTC-midnight Date. */
export function todayUtc(): Date {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z");
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

/** Every night of a stay as ISO date strings (check-out exclusive). */
export function nightsOf(checkIn: Date, checkOut: Date): string[] {
  const nights: string[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) nights.push(toIsoDate(d));
  return nights;
}

/** Half-open range overlap: [aStart, aEnd) ∩ [bStart, bEnd) ≠ ∅ */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
