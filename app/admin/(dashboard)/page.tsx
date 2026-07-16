import Link from "next/link";
import { getDashboardStats } from "@/lib/admin/stats";
import { formatGbp } from "@/lib/booking/quote";
import StatusBadge from "@/components/admin/StatusBadge";
import Card from "@/components/admin/Card";
import StatCard from "@/components/admin/StatCard";
import PageHeader from "@/components/admin/PageHeader";
import { IconBookings, IconCalendar, IconAnalytics, IconGuests } from "@/components/admin/icons";

// Reads live DB data — must never be statically prerendered at build time
// (no DB is reachable during the Vercel build step).
export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        subtitle="A snapshot of the business right now."
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Needs approval"
          value={String(stats.pendingApproval.length)}
          hint={stats.pendingApproval.length > 0 ? "Waiting on you" : "All caught up"}
          icon={<IconBookings />}
        />
        <StatCard
          label="Check-ins (7 days)"
          value={String(stats.upcomingCheckIns)}
          icon={<IconCalendar />}
        />
        <StatCard
          label="Revenue this month"
          value={formatGbp(stats.revenueThisMonthPence)}
          hint="Confirmed stays"
          icon={<IconAnalytics />}
        />
        <StatCard
          label="Occupancy (30 days)"
          value={`${stats.occupancyNext30}%`}
          icon={<IconGuests />}
        />
      </div>

      {stats.declinedDeposits.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-red-700">Deposit holds need attention</h2>
          <Card className="mt-3 overflow-hidden border-red-200/70 bg-red-50/60 p-0">
            {stats.declinedDeposits.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between gap-4 border-b border-red-100 px-5 py-4 transition-colors last:border-0 hover:bg-red-100/40"
              >
                <div>
                  <p className="font-medium">{b.guest.name}</p>
                  <p className="text-sm text-ink/50">
                    {b.reference} · {b.checkIn.toISOString().slice(0, 10)} → {b.checkOut.toISOString().slice(0, 10)}
                  </p>
                </div>
                <p className="text-sm font-medium text-red-700">Deposit hold declined</p>
              </Link>
            ))}
          </Card>
        </section>
      )}

      {stats.pendingApproval.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold">Needs your approval</h2>
          <Card className="mt-3 overflow-hidden p-0">
            {stats.pendingApproval.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between gap-4 border-b border-ink/5 px-5 py-4 transition-colors last:border-0 hover:bg-gold/[0.06]"
              >
                <div>
                  <p className="font-medium">{b.guest.name}</p>
                  <p className="text-sm text-ink/50">
                    {b.reference} · {b.checkIn.toISOString().slice(0, 10)} → {b.checkOut.toISOString().slice(0, 10)} ·{" "}
                    {b.guests} guest(s)
                  </p>
                </div>
                <p className="admin-stat-value font-semibold">{formatGbp(b.total)}</p>
              </Link>
            ))}
          </Card>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent bookings</h2>
          <Link href="/admin/bookings" className="text-sm font-medium text-gold-dark hover:underline">
            View all →
          </Link>
        </div>
        <Card className="mt-3 overflow-hidden p-0">
          {stats.recentBookings.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink/50">No bookings yet.</p>
          )}
          {stats.recentBookings.map((b) => (
            <Link
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              className="flex items-center justify-between gap-4 border-b border-ink/5 px-5 py-4 transition-colors last:border-0 hover:bg-gold/[0.06]"
            >
              <div>
                <p className="font-medium">{b.guest.name}</p>
                <p className="text-sm text-ink/50">
                  {b.reference} · {b.checkIn.toISOString().slice(0, 10)} → {b.checkOut.toISOString().slice(0, 10)}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </Link>
          ))}
        </Card>
      </section>
    </div>
  );
}
