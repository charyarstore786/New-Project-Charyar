import { NextResponse } from "next/server";
import { promises as fsp } from "fs";
import path from "path";
import { buildICalFeed, type CalendarBlock } from "@/lib/ical";
import { site } from "@/lib/site";

/**
 * Outbound availability feed: GET /api/calendar.ics
 *
 * Serves a spec-valid iCalendar of dates the studio is NOT available for
 * direct booking. Paste this URL into Sympl once and every OTA behind it
 * blocks these dates automatically.
 *
 * Source: data/calendar-blocks.json — an array of { start, end, summary }
 * ranges (checkout date exclusive). The booking engine will append to this
 * file as direct bookings are confirmed; the owner can also block dates by
 * hand. A missing file just yields a valid, empty calendar.
 */

const BLOCKS_FILE = path.join(process.cwd(), "data", "calendar-blocks.json");

export const dynamic = "force-dynamic";

async function readBlocks(): Promise<CalendarBlock[]> {
  try {
    const raw = await fsp.readFile(BLOCKS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CalendarBlock[]) : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const blocks = await readBlocks();
  const domain = new URL(site.url).hostname || "newportstudio.local";

  const feed = buildICalFeed(blocks, {
    name: `${site.name} — Direct Bookings`,
    domain,
  });

  return new NextResponse(feed, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="newport-studio.ics"',
      // let importers cache briefly but stay fresh
      "Cache-Control": "public, max-age=300, must-revalidate",
    },
  });
}
