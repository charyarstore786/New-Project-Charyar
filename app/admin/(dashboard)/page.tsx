import Link from "next/link";
import { getDashboardStats } from "@/lib/admin/stats";
import { formatGbp } from "@/lib/booking/quote";
import StatusBadge from "@/components/admin/StatusBadge";

// Reads live DB data — must never be statically prerendered at build time
// (no DB is reachable during the Vercel build step).
export const dynamic = "force-dynamic";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <p className="text-sm text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </div>
  );
}

export default async function AdminOverviewPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-ink/50">A snapshot of the business right now.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Needs approval"
          value={String(stats.pendingApproval.length)}
          hint={stats.pendingApproval.length > 0 ? "Waiting on you" : "All caught up"}
        />
        <StatCard label="Check-ins (next 7 days)" value={String(stats.upcomingCheckIns)} />
        <StatCard label="Revenue this month" value={formatGbp(stats.revenueThisMonthPence)} hint="Confirmed stays" />
        <StatCard label="Occupancy (next 30 days)" value={`${stats.occupancyNext30}%`} />
      </div>

      {stats.declinedDeposits.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-red-700">Deposit holds need attention</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-red-200 bg-red-50 shadow-sm">
            {stats.declinedDeposits.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between gap-4 border-b border-red-100 px-5 py-4 last:border-0 hover:bg-red-100/50"
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
          </div>
        </section>
      )}

      {stats.pendingApproval.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold">Needs your approval</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
            {stats.pendingApproval.map((b) => (
              <Link
                key={b.id}
                href={`/admin/bookings/${b.id}`}
                className="flex items-center justify-between gap-4 border-b border-ink/5 px-5 py-4 last:border-0 hover:bg-ink/5"
              >
                <div>
                  <p className="font-medium">{b.guest.name}</p>
                  <p className="text-sm text-ink/50">
                    {b.reference} · {b.checkIn.toISOString().slice(0, 10)} → {b.checkOut.toISOString().slice(0, 10)} · {b.guests} guest(s)
                  </p>
                </div>
                <p className="font-semibold">{formatGbp(b.total)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Recent bookings</h2>
          <Link href="/admin/bookings" className="text-sm font-medium text-accent-dark hover:underline">
            View all →
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
          {stats.recentBookings.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink/50">No bookings yet.</p>
          )}
          {stats.recentBookings.map((b) => (
            <Link
              key={b.id}
              href={`/admin/bookings/${b.id}`}
              className="flex items-center justify-between gap-4 border-b border-ink/5 px-5 py-4 last:border-0 hover:bg-ink/5"
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
        </div>
      </section>
    </div>
  );
}
