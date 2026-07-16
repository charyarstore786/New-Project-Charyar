import { getAnalytics } from "@/lib/admin/analytics";
import { formatGbp } from "@/lib/booking/quote";
import Card from "@/components/admin/Card";
import StatCard from "@/components/admin/StatCard";
import PageHeader from "@/components/admin/PageHeader";
import { IconAnalytics, IconBookings, IconCalendar, IconGuests } from "@/components/admin/icons";

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

export default async function AnalyticsPage() {
  const stats = await getAnalytics();
  const maxRevenue = Math.max(1, ...stats.monthly.map((m) => m.revenuePence));

  return (
    <div>
      <PageHeader eyebrow="Insights" title="Analytics" subtitle="Revenue, occupancy and booking trends." />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total revenue"
          value={formatGbp(stats.totalRevenuePence)}
          hint="Confirmed"
          icon={<IconAnalytics />}
        />
        <StatCard label="Total bookings" value={String(stats.totalBookings)} hint="Confirmed" icon={<IconBookings />} />
        <StatCard label="Avg nightly rate" value={formatGbp(stats.avgNightlyRatePence)} icon={<IconCalendar />} />
        <StatCard label="Occupancy (30 days)" value={`${stats.occupancyLast30}%`} icon={<IconGuests />} />
      </div>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg font-semibold">Revenue by month</h2>
        <div className="mt-5 space-y-3">
          {stats.monthly.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="w-14 flex-none text-sm text-ink/60">{m.label}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-full bg-ink/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-light via-gold to-gold-dark"
                  style={{ width: `${Math.max(2, (m.revenuePence / maxRevenue) * 100)}%` }}
                />
              </div>
              <span className="admin-stat-value w-28 flex-none text-right text-sm font-medium">
                {formatGbp(m.revenuePence)}
              </span>
              <span className="w-16 flex-none text-right text-xs text-ink/40">{m.bookings} bkg</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-8 p-6">
        <h2 className="font-display text-lg font-semibold">Bookings by status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="rounded-xl bg-gold/[0.06] px-4 py-3">
              <p className="admin-eyebrow">{STATUS_LABELS[status] ?? status}</p>
              <p className="admin-stat-value mt-1 font-display text-xl font-semibold">{count}</p>
            </div>
          ))}
          {Object.keys(stats.byStatus).length === 0 && <p className="text-sm text-ink/50">No bookings yet.</p>}
        </div>
      </Card>
    </div>
  );
}
