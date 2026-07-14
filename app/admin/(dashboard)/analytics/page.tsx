import { getAnalytics } from "@/lib/admin/analytics";
import { formatGbp } from "@/lib/booking/quote";

// Reads live DB data — must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PENDING_VERIFICATION: "Pending verification",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <p className="text-sm text-ink/50">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const stats = await getAnalytics();
  const maxRevenue = Math.max(1, ...stats.monthly.map((m) => m.revenuePence));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Analytics</h1>
      <p className="mt-1 text-sm text-ink/50">Revenue, occupancy and booking trends.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total revenue (confirmed)" value={formatGbp(stats.totalRevenuePence)} />
        <StatCard label="Total bookings (confirmed)" value={String(stats.totalBookings)} />
        <StatCard label="Average nightly rate" value={formatGbp(stats.avgNightlyRatePence)} />
        <StatCard label="Occupancy (last 30 days)" value={`${stats.occupancyLast30}%`} />
      </div>

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Revenue by month</h2>
        <div className="mt-5 space-y-3">
          {stats.monthly.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="w-14 flex-none text-sm text-ink/60">{m.label}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-full bg-ink/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-400 via-accent to-accent-dark"
                  style={{ width: `${Math.max(2, (m.revenuePence / maxRevenue) * 100)}%` }}
                />
              </div>
              <span className="w-28 flex-none text-right text-sm font-medium">{formatGbp(m.revenuePence)}</span>
              <span className="w-16 flex-none text-right text-xs text-ink/40">{m.bookings} bkg</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Bookings by status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="rounded-xl bg-ink/5 px-4 py-3">
              <p className="text-xs text-ink/50">{STATUS_LABELS[status] ?? status}</p>
              <p className="mt-1 font-display text-xl font-semibold">{count}</p>
            </div>
          ))}
          {Object.keys(stats.byStatus).length === 0 && <p className="text-sm text-ink/50">No bookings yet.</p>}
        </div>
      </section>
    </div>
  );
}
