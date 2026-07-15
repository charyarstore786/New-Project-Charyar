import { NextResponse } from "next/server";
import { buildICalFeed, type CalendarBlock } from "@/lib/ical";
import { site } from "@/lib/site";
import { db } from "@/lib/db";
import { BLOCKING_STATUSES } from "@/lib/booking/availability";
import { toIsoDate } from "@/lib/booking/dates";

/**
 * Outbound availability feed: GET /api/calendar.ics
 *
 * Spec-valid iCalendar of dates the studio is NOT available for direct
 * booking, read live from the database. Paste this URL into Sympl (or any
 * other channel manager) once and every OTA behind it blocks these dates
 * automatically — see /admin/sync for the URL and a preview of what it
 * currently contains.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const bookings = await db.booking.findMany({
    where: {
      status: { in: [...BLOCKING_STATUSES] },
      checkOut: { gt: new Date() },
    },
    select: { reference: true, checkIn: true, checkOut: true },
    orderBy: { checkIn: "asc" },
  });

  const blocks: CalendarBlock[] = bookings.map((b) => ({
    start: toIsoDate(b.checkIn),
    end: toIsoDate(b.checkOut),
    summary: `Reserved — ${b.reference}`,
    uid: `booking-${b.reference}`,
  }));

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
