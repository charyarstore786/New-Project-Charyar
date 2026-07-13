/**
 * Minimal, spec-valid iCalendar (RFC 5545) feed builder for the site's
 * outbound availability export. Sympl (and every OTA behind it) imports
 * this feed and blocks the dates our direct bookings occupy.
 *
 * All-day event convention: DTSTART is the arrival date (inclusive) and
 * DTEND is the checkout date (EXCLUSIVE) — i.e. the morning the guest
 * leaves, which is bookable again that night. This matches how Airbnb,
 * Booking.com and Vrbo interpret imported blocks.
 */

export type CalendarBlock = {
  /** ISO date, arrival — YYYY-MM-DD */
  start: string;
  /** ISO date, checkout (exclusive) — YYYY-MM-DD */
  end: string;
  summary?: string;
  uid?: string;
};

/** YYYY-MM-DD -> YYYYMMDD (DATE value), rejecting anything malformed. */
function toDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  // basic range sanity
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}${mo}${d}`;
}

/** Fold long lines and escape text per RFC 5545. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function stampNow(): string {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildICalFeed(
  blocks: CalendarBlock[],
  opts: { name: string; domain: string },
): string {
  const dtstamp = stampNow();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Short Stay Newport//Direct Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(opts.name)}`,
  ];

  let seq = 0;
  for (const block of blocks) {
    const start = toDate(block.start);
    const end = toDate(block.end);
    if (!start || !end || end <= start) continue; // skip invalid ranges

    seq += 1;
    const uid = block.uid ?? `block-${start}-${end}-${seq}@${opts.domain}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeText(block.summary ?? "Not available")}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");

  // RFC 5545 requires CRLF line breaks
  return lines.join("\r\n") + "\r\n";
}
