import "server-only";
import { db } from "@/lib/db";

const CONFIRMED_STATUSES = ["APPROVED", "CHECKED_IN", "CHECKED_OUT", "CLOSED"];

export type MonthlyRevenue = { label: string; revenuePence: number; bookings: number };

export async function getAnalytics() {
  const now = new Date();
  const monthsBack = 6;
  const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));

  const [confirmedBookings, statusCounts, allBookings] = await Promise.all([
    db.booking.findMany({
      where: { status: { in: CONFIRMED_STATUSES }, checkIn: { gte: rangeStart } },
      select: { checkIn: true, total: true, nightlyRate: true, nights: true },
    }),
    db.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    db.booking.findMany({
      where: { status: { in: CONFIRMED_STATUSES } },
      select: { total: true, nightlyRate: true },
    }),
  ]);

  // Monthly revenue for the last 6 months, oldest first
  const monthly: MonthlyRevenue[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1));
    const inMonth = confirmedBookings.filter((b) => b.checkIn >= monthStart && b.checkIn < monthEnd);
    monthly.push({
      label: monthStart.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
      revenuePence: inMonth.reduce((sum, b) => sum + b.total, 0),
      bookings: inMonth.length,
    });
  }

  const totalRevenuePence = allBookings.reduce((sum, b) => sum + b.total, 0);
  const avgNightlyRatePence = allBookings.length
    ? Math.round(allBookings.reduce((sum, b) => sum + b.nightlyRate, 0) / allBookings.length)
    : 0;

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) byStatus[row.status] = row._count._all;

  // Occupancy over the last 30 days actually elapsed (distinct from the dashboard's forward-looking version)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);
  const recentStays = await db.booking.findMany({
    where: { status: { in: CONFIRMED_STATUSES }, checkIn: { lt: now }, checkOut: { gt: thirtyDaysAgo } },
    select: { checkIn: true, checkOut: true },
  });
  let occupiedNights = 0;
  for (const b of recentStays) {
    const start = b.checkIn < thirtyDaysAgo ? thirtyDaysAgo : b.checkIn;
    const end = b.checkOut > now ? now : b.checkOut;
    occupiedNights += Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  }
  const occupancyLast30 = Math.round((occupiedNights / 30) * 100);

  return {
    monthly,
    totalRevenuePence,
    avgNightlyRatePence,
    totalBookings: allBookings.length,
    byStatus,
    occupancyLast30,
  };
}
