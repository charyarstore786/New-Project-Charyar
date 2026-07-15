import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getChannelProvider } from "@/lib/channel-manager";

type DbClient = PrismaClient | Prisma.TransactionClient;
import { addDays, nightsOf, parseIsoDate, rangesOverlap, toIsoDate, todayUtc } from "./dates";

/** Booking statuses that keep dates blocked on the calendar. */
export const BLOCKING_STATUSES = [
  "PENDING_VERIFICATION",
  "PENDING_APPROVAL",
  "APPROVED",
  "CHECKED_IN",
] as const;

const SYNC_INTERVAL_MS = 10 * 60 * 1000;
let lastSyncAt = 0;

/**
 * Refresh CalendarBlock from the channel provider (Sympl iCal or mock),
 * at most once per interval. Failures leave the previous blocks in place —
 * stale data fails safe because approval is still manual.
 */
export async function syncExternalBlocks(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSyncAt < SYNC_INTERVAL_MS) return;

  const provider = await getChannelProvider();
  let blocks;
  try {
    blocks = await provider.getBlocks();
  } catch (err) {
    console.error(`Channel sync (${provider.name}) failed:`, err);
    return;
  }
  lastSyncAt = now;

  const seenUids = blocks.map((b) => b.uid);
  await db.$transaction([
    ...blocks.map((b) =>
      db.calendarBlock.upsert({
        where: { uid: b.uid },
        create: {
          uid: b.uid,
          start: parseIsoDate(b.start) ?? new Date(b.start),
          end: parseIsoDate(b.end) ?? new Date(b.end),
          summary: b.summary,
          source: provider.name,
        },
        update: {
          start: parseIsoDate(b.start) ?? new Date(b.start),
          end: parseIsoDate(b.end) ?? new Date(b.end),
          summary: b.summary,
          syncedAt: new Date(),
        },
      }),
    ),
    // Blocks that disappeared from the feed were cancelled upstream
    db.calendarBlock.deleteMany({
      where: { source: provider.name, uid: { notIn: seenUids } },
    }),
  ]);
}

/**
 * Every unavailable night from today up to `horizonDays` ahead, as ISO date
 * strings — drives the greyed-out dates in the booking calendar.
 */
export async function getBlockedNights(horizonDays = 400): Promise<string[]> {
  await syncExternalBlocks();

  const from = todayUtc();
  const to = addDays(from, horizonDays);

  const [bookings, external] = await Promise.all([
    db.booking.findMany({
      where: {
        status: { in: [...BLOCKING_STATUSES] },
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
      select: { checkIn: true, checkOut: true },
    }),
    db.calendarBlock.findMany({
      where: { start: { lt: to }, end: { gt: from } },
      select: { start: true, end: true },
    }),
  ]);

  const blocked = new Set<string>();
  for (const range of [...bookings.map((b) => ({ s: b.checkIn, e: b.checkOut })), ...external.map((b) => ({ s: b.start, e: b.end }))]) {
    const start = range.s < from ? from : range.s;
    const end = range.e > to ? to : range.e;
    for (const night of nightsOf(start, end)) blocked.add(night);
  }
  return [...blocked].sort();
}

/**
 * Availability check for one candidate stay. Also used as the second guard
 * inside the booking transaction.
 */
export async function isRangeAvailable(
  checkIn: Date,
  checkOut: Date,
  client: DbClient = db,
): Promise<boolean> {
  const [bookingClash, externalClash] = await Promise.all([
    client.booking.findFirst({
      where: {
        status: { in: [...BLOCKING_STATUSES] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { id: true },
    }),
    client.calendarBlock.findFirst({
      where: { start: { lt: checkOut }, end: { gt: checkIn } },
      select: { id: true },
    }),
  ]);
  return !bookingClash && !externalClash;
}

export { rangesOverlap, toIsoDate };
