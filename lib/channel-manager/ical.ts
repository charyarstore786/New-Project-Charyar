import type { ChannelProvider, ExternalBlock } from "./types";

/**
 * Sympl iCal provider: fetches the owner's Sympl export URL and parses
 * VEVENTs into external blocks. Push/cancel are no-ops because Sympl pulls
 * our own /api/calendar.ics feed for the reverse direction.
 */
export class ICalProvider implements ChannelProvider {
  readonly name = "sympl-ical";

  constructor(private readonly url: string) {}

  async getBlocks(): Promise<ExternalBlock[]> {
    const res = await fetch(this.url, {
      headers: { "User-Agent": "NewportStudio/1.0 calendar-sync" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`iCal fetch failed: HTTP ${res.status}`);
    return parseIcs(await res.text());
  }

  async pushBooking(): Promise<void> {}

  async cancelBooking(): Promise<void> {}
}

/**
 * Minimal iCalendar parser covering what channel-manager exports emit:
 * VEVENT blocks with UID, DTSTART/DTEND (DATE or DATE-TIME) and SUMMARY.
 */
export function parseIcs(ics: string): ExternalBlock[] {
  // Unfold continuation lines (RFC 5545 §3.1) and normalize newlines
  const lines = ics.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");

  const blocks: ExternalBlock[] = [];
  let current: Partial<ExternalBlock> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT") {
      // Some feeds (e.g. HomeAway/Vrbo blocks relayed through Sympl) omit UID
      // entirely — a missing UID must never drop the event, since that's a
      // real booking's dates silently not getting blocked. Synthesize a
      // stable one from the fields we do have so re-syncs stay idempotent.
      if (current && current.start && current.end) {
        if (!current.uid) {
          current.uid = `generated-${current.start}-${current.end}-${(current.summary ?? "").replace(/\s+/g, "_")}`;
        }
        blocks.push(current as ExternalBlock);
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const [nameWithParams, value] = [line.slice(0, colon), line.slice(colon + 1)];
    const name = nameWithParams.split(";")[0].toUpperCase();

    if (name === "UID") current.uid = value.trim();
    else if (name === "SUMMARY") current.summary = value.trim();
    else if (name === "DTSTART") current.start = icsDateToIso(value);
    else if (name === "DTEND") current.end = icsDateToIso(value);
  }

  return blocks.filter((b) => b.start < b.end);
}

/** "20260715" or "20260715T140000Z" → "2026-07-15" */
function icsDateToIso(value: string): string {
  const digits = value.trim();
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}
