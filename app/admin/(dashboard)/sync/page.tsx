import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getSymplIcalUrl } from "@/lib/pricing";
import { BLOCKING_STATUSES } from "@/lib/booking/availability";
import { toIsoDate } from "@/lib/booking/dates";
import Card from "@/components/admin/Card";
import PageHeader from "@/components/admin/PageHeader";
import { ExportSection, ImportSection } from "./SyncForm";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const [symplIcalUrl, exportBookings, importedBlocks] = await Promise.all([
    getSymplIcalUrl(),
    db.booking.findMany({
      where: { status: { in: [...BLOCKING_STATUSES] }, checkOut: { gt: new Date() } },
      select: { reference: true, checkIn: true, checkOut: true },
      orderBy: { checkIn: "asc" },
    }),
    db.calendarBlock.findMany({
      where: { end: { gt: new Date() } },
      orderBy: { start: "asc" },
    }),
  ]);

  // Derived from the actual request, not NEXT_PUBLIC_SITE_URL — that env var
  // was never set in Vercel, so relying on it silently showed "localhost" here.
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const feedUrl = `${proto}://${host}/api/calendar.ics`;

  return (
    <div>
      <PageHeader
        eyebrow="Channel manager"
        title="iCal sync"
        subtitle="Keeps direct bookings and other platforms (Airbnb, Booking.com, Vrbo via Sympl) from double-booking each other."
      />

      <div className="mt-6 space-y-6">
        <ExportSection feedUrl={feedUrl} />

        <Card className="p-6">
          <h2 className="font-display text-base font-semibold">Currently published ({exportBookings.length})</h2>
          {exportBookings.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50">No upcoming direct bookings to publish.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {exportBookings.map((b) => (
                <li key={b.reference} className="flex justify-between border-b border-ink/5 py-1.5 last:border-0">
                  <span className="text-ink/60">{b.reference}</span>
                  <span>
                    {toIsoDate(b.checkIn)} → {toIsoDate(b.checkOut)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <ImportSection initialUrl={symplIcalUrl ?? ""} lastSyncedCount={importedBlocks.length} />

        <Card className="p-6">
          <h2 className="font-display text-base font-semibold">Currently imported ({importedBlocks.length})</h2>
          {importedBlocks.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50">No external blocks on file.</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {importedBlocks.map((b) => (
                <li key={b.id} className="flex justify-between border-b border-ink/5 py-1.5 last:border-0">
                  <span className="text-ink/60">{b.summary || "External booking"}</span>
                  <span>
                    {toIsoDate(b.start)} → {toIsoDate(b.end)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
