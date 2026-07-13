import "server-only";
import { db } from "@/lib/db";
import { todayUtc, addDays } from "@/lib/booking/dates";

/** Statuses that represent a confirmed, revenue-generating stay. */
const CONFIRMED_STATUSES = ["APPROVED", "CHECKED_IN", "CHECKED_OUT", "CLOSED"];

export async function getDashboardStats() {
  const today = todayUtc();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const next7 = addDays(today, 7);
  const next30 = addDays(today, 30);

  const [
    pendingApproval,
    upcomingCheckIns,
    revenueThisMonth,
    nightsBookedNext30,
    recentBookings,
  ] = await Promise.all([
    db.booking.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: { guest: true },
      orderBy: { createdAt: "asc" },
    }),
    db.booking.count({
      where: {
        status: { in: ["APPROVED", "CHECKED_IN"] },
        checkIn: { gte: today, lt: next7 },
      },
    }),
    db.booking.aggregate({
      where: { status: { in: CONFIRMED_STATUSES }, checkIn: { gte: monthStart } },
      _sum: { total: true },
    }),
    db.booking.findMany({
      where: {
        status: { in: ["APPROVED", "CHECKED_IN", "CHECKED_OUT", "CLOSED"] },
        checkIn: { lt: next30 },
        checkOut: { gt: today },
      },
      select: { checkIn: true, checkOut: true },
    }),
    db.booking.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { guest: true },
    }),
  ]);

  let bookedNights = 0;
  for (const b of nightsBookedNext30) {
    const start = b.checkIn < today ? today : b.checkIn;
    const end = b.checkOut > next30 ? next30 : b.checkOut;
    bookedNights += Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  }
  const occupancyNext30 = Math.round((bookedNights / 30) * 100);

  return {
    pendingApproval,
    upcomingCheckIns,
    revenueThisMonthPence: revenueThisMonth._sum.total ?? 0,
    occupancyNext30,
    recentBookings,
  };
}
