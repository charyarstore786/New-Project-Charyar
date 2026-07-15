import Link from "next/link";
import { db } from "@/lib/db";
import { toIsoDate } from "@/lib/booking/dates";
import BlockDatesForm from "./BlockDatesForm";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BLOCKING_STATUSES = ["PENDING_VERIFICATION", "PENDING_APPROVAL", "APPROVED", "CHECKED_IN"];

function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toIsoDate(new Date(Date.UTC(year, month, d))));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const { y, m } = await searchParams;
  const now = new Date();
  const year = y ? Number(y) : now.getUTCFullYear();
  const month = m ? Number(m) - 1 : now.getUTCMonth();

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));

  const [bookings, blocks, manualBlocks] = await Promise.all([
    db.booking.findMany({
      where: {
        status: { in: BLOCKING_STATUSES },
        checkIn: { lt: monthEnd },
        checkOut: { gt: monthStart },
      },
      include: { guest: true },
    }),
    db.calendarBlock.findMany({
      where: { start: { lt: monthEnd }, end: { gt: monthStart } },
    }),
    db.calendarBlock.findMany({
      where: { source: "manual", end: { gt: new Date() } },
      orderBy: { start: "asc" },
    }),
  ]);

  // Map each night → what's occupying it (direct booking wins display priority)
  const nightInfo = new Map<string, { label: string; href?: string; external?: boolean; manual?: boolean }>();
  for (const b of bookings) {
    for (let d = b.checkIn; d < b.checkOut; d = new Date(d.getTime() + 86_400_000)) {
      nightInfo.set(toIsoDate(d), { label: `${b.guest.name} (${b.reference})`, href: `/admin/bookings/${b.id}` });
    }
  }
  for (const blk of blocks) {
    for (let d = blk.start; d < blk.end; d = new Date(d.getTime() + 86_400_000)) {
      const iso = toIsoDate(d);
      if (!nightInfo.has(iso)) {
        nightInfo.set(iso, {
          label: blk.summary || "External booking",
          external: blk.source !== "manual",
          manual: blk.source === "manual",
        });
      }
    }
  }

  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Calendar</h1>
      <p className="mt-1 text-sm text-ink/50">
        Direct bookings and externally synced blocks (Airbnb / Booking.com / Vrbo via Sympl).
      </p>

      <div className="mt-5 flex items-center justify-between">
        <Link
          href={`/admin/calendar?y=${prev.getUTCFullYear()}&m=${prev.getUTCMonth() + 1}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 hover:bg-ink/5"
        >
          ←
        </Link>
        <p className="font-display text-lg font-semibold">
          {MONTHS[month]} {year}
        </p>
        <Link
          href={`/admin/calendar?y=${next.getUTCFullYear()}&m=${next.getUTCMonth() + 1}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 hover:bg-ink/5"
        >
          →
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-ink/50">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {monthGrid(year, month).map((iso, i) => {
          if (!iso) return <div key={i} />;
          const info = nightInfo.get(iso);
          const cell = (
            <div
              className={`flex h-20 flex-col rounded-lg border p-1.5 text-left text-xs ${
                info
                  ? info.manual
                    ? "border-amber-200 bg-amber-50"
                    : info.external
                      ? "border-sky-200 bg-sky-50"
                      : "border-accent/30 bg-accent/10"
                  : "border-ink/10 bg-white"
              }`}
            >
              <span className="font-semibold">{Number(iso.slice(8, 10))}</span>
              {info && <span className="mt-1 line-clamp-2 text-[11px] text-ink/70">{info.label}</span>}
            </div>
          );
          return info?.href ? (
            <Link key={iso} href={info.href}>
              {cell}
            </Link>
          ) : (
            <div key={iso}>{cell}</div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink/50">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-accent/20" /> Direct booking
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-sky-100" /> External (Sympl)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-amber-100" /> Blocked by you
        </span>
      </div>

      <div className="mt-8">
        <BlockDatesForm
          blocks={manualBlocks.map((b) => ({
            id: b.id,
            start: toIsoDate(b.start),
            end: toIsoDate(b.end),
            summary: b.summary,
          }))}
        />
      </div>
    </div>
  );
}
