import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { getSymplIcalUrl } from "@/lib/pricing";
import { BLOCKING_STATUSES } from "@/lib/booking/availability";
import { toIsoDate } from "@/lib/booking/dates";
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

  const feedUrl = `${site.url.replace(/\/$/, "")}/api/calendar.ics`;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">iCal sync</h1>
      <p className="mt-1 text-sm text-ink/50">
        Keeps direct bookings and other platforms (Airbnb, Booking.com, Vrbo via Sympl) from double-booking each
        other.
      </p>

      <div className="mt-6 space-y-6">
        <ExportSection feedUrl={feedUrl} />

        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
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
        </div>

        <ImportSection initialUrl={symplIcalUrl ?? ""} lastSyncedCount={importedBlocks.length} />

        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
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
        </div>
      </div>
    </div>
  );
}
