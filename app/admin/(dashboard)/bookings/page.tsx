import Link from "next/link";
import { db } from "@/lib/db";
import { formatGbp } from "@/lib/booking/quote";
import StatusBadge from "@/components/admin/StatusBadge";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "PENDING_APPROVAL", label: "Needs approval" },
  { key: "APPROVED", label: "Approved" },
  { key: "CHECKED_IN", label: "Checked in" },
  { key: "CHECKED_OUT", label: "Checked out" },
  { key: "REJECTED", label: "Rejected" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const activeFilter = status && FILTERS.some((f) => f.key === status) ? status : "all";

  const bookings = await db.booking.findMany({
    where: {
      ...(activeFilter !== "all" ? { status: activeFilter } : {}),
      ...(q
        ? {
            OR: [
              { reference: { contains: q } },
              { guest: { name: { contains: q } } },
              { guest: { email: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { guest: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Bookings</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/bookings" : `/admin/bookings?status=${f.key}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === f.key ? "bg-ink text-white" : "bg-white text-ink/60 hover:bg-ink/5"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form className="mt-4" action="/admin/bookings">
        {activeFilter !== "all" && <input type="hidden" name="status" value={activeFilter} />}
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by reference, guest name or email…"
          className="w-full max-w-sm rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="px-5 py-3 font-medium">Reference</th>
              <th className="px-5 py-3 font-medium">Guest</th>
              <th className="px-5 py-3 font-medium">Dates</th>
              <th className="px-5 py-3 font-medium">Guests</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-ink/5 last:border-0 hover:bg-ink/5">
                <td className="px-5 py-3">
                  <Link href={`/admin/bookings/${b.id}`} className="font-medium text-accent-dark hover:underline">
                    {b.reference}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <p>{b.guest.name}</p>
                  <p className="text-xs text-ink/40">{b.guest.email}</p>
                </td>
                <td className="px-5 py-3 whitespace-nowrap">
                  {b.checkIn.toISOString().slice(0, 10)} → {b.checkOut.toISOString().slice(0, 10)}
                </td>
                <td className="px-5 py-3">{b.guests}</td>
                <td className="px-5 py-3 font-medium">{formatGbp(b.total)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={b.status} />
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-ink/50">
                  No bookings match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
