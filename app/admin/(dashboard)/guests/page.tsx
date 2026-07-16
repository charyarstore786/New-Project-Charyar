import Link from "next/link";
import { db } from "@/lib/db";
import { formatGbp } from "@/lib/booking/quote";
import Card from "@/components/admin/Card";
import PageHeader from "@/components/admin/PageHeader";

// Reads live DB data — must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

const CONFIRMED_STATUSES = ["APPROVED", "CHECKED_IN", "CHECKED_OUT", "CLOSED"];

export default async function GuestsPage() {
  const guests = await db.guest.findMany({
    orderBy: { createdAt: "desc" },
    include: { bookings: { orderBy: { checkIn: "desc" } } },
  });

  const rows = guests.map((g) => {
    const confirmedBookings = g.bookings.filter((b) => CONFIRMED_STATUSES.includes(b.status));
    const totalSpentPence = confirmedBookings.reduce((sum, b) => sum + b.total, 0);
    const mostRecent = g.bookings[0];
    return {
      ...g,
      bookingCount: g.bookings.length,
      totalSpentPence,
      mostRecent,
    };
  });

  return (
    <div>
      <PageHeader eyebrow="People" title="Guests" subtitle="Everyone who's booked, with their stay history." />

      <Card className="mt-6 overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink/50">No guests yet.</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/45">
                <th className="admin-eyebrow px-5 py-3 font-semibold">Guest</th>
                <th className="admin-eyebrow px-5 py-3 font-semibold">Contact</th>
                <th className="admin-eyebrow px-5 py-3 font-semibold">Bookings</th>
                <th className="admin-eyebrow px-5 py-3 font-semibold">Total spent</th>
                <th className="admin-eyebrow px-5 py-3 font-semibold">Most recent stay</th>
                <th className="admin-eyebrow px-5 py-3 font-semibold">Verification</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={g.id} className="border-b border-ink/5 transition-colors last:border-0 hover:bg-gold/[0.05]">
                  <td className="px-5 py-4 font-medium">{g.name}</td>
                  <td className="px-5 py-4 text-ink/70">
                    <p>{g.email}</p>
                    <p className="text-xs text-ink/40">{g.phone}</p>
                  </td>
                  <td className="px-5 py-4">{g.bookingCount}</td>
                  <td className="admin-stat-value px-5 py-4 font-medium">{formatGbp(g.totalSpentPence)}</td>
                  <td className="px-5 py-4">
                    {g.mostRecent ? (
                      <Link href={`/admin/bookings/${g.mostRecent.id}`} className="text-gold-dark hover:underline">
                        {g.mostRecent.checkIn.toISOString().slice(0, 10)} ({g.mostRecent.reference})
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-ink/60">{g.verificationStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
