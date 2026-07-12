"use client";

import { useMemo, useState } from "react";
import { addDays, parseIsoDate, toIsoDate, todayUtc } from "@/lib/booking/dates";

type Props = {
  /** ISO dates of unavailable nights */
  blocked: Set<string>;
  horizonDays: number;
  maxNights: number;
  checkIn: string | null;
  checkOut: string | null;
  onChange: (checkIn: string | null, checkOut: string | null) => void;
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Calendar cells for one month, Monday-first; null = leading/trailing pad. */
function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toIsoDate(new Date(Date.UTC(year, month, d))));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function Calendar({
  blocked,
  horizonDays,
  maxNights,
  checkIn,
  checkOut,
  onChange,
}: Props) {
  const today = todayUtc();
  const todayIso = toIsoDate(today);
  const lastBookable = toIsoDate(addDays(today, horizonDays));

  const [viewYear, setViewYear] = useState(today.getUTCFullYear());
  const [viewMonth, setViewMonth] = useState(today.getUTCMonth());

  // While picking a check-out: latest allowed date, bounded by the next
  // blocked night and the max stay length (check-out on a blocked day is
  // fine — nights are what matter).
  const maxCheckout = useMemo(() => {
    if (!checkIn || checkOut) return null;
    const start = parseIsoDate(checkIn)!;
    let limit = addDays(start, maxNights);
    for (let d = start; d < limit; d = addDays(d, 1)) {
      if (blocked.has(toIsoDate(d))) {
        limit = d;
        break;
      }
    }
    return toIsoDate(limit);
  }, [checkIn, checkOut, blocked, maxNights]);

  function pick(iso: string) {
    if (!checkIn || checkOut) {
      // Fresh selection
      onChange(iso, null);
      return;
    }
    if (iso <= checkIn) {
      // Clicked at/before the current start — restart from there
      onChange(iso, null);
      return;
    }
    onChange(checkIn, iso);
  }

  function cellState(iso: string) {
    const isPast = iso < todayIso;
    const beyondHorizon = iso > lastBookable;
    const isBlockedNight = blocked.has(iso);
    const selectingEnd = !!checkIn && !checkOut;

    let disabled: boolean;
    if (selectingEnd) {
      // Valid check-outs: after check-in, within the contiguous free run.
      // Earlier dates stay clickable to restart the selection.
      disabled =
        isPast ||
        (iso > checkIn! && !!maxCheckout && iso > maxCheckout) ||
        (iso <= checkIn! && (isBlockedNight || beyondHorizon)) ||
        (iso > checkIn! && beyondHorizon);
    } else {
      disabled = isPast || isBlockedNight || beyondHorizon;
    }

    const inRange = !!checkIn && !!checkOut && iso > checkIn && iso < checkOut;
    const isStart = iso === checkIn;
    const isEnd = iso === checkOut;
    return { disabled, inRange, isStart, isEnd, isBlockedNight };
  }

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  const canGoBack =
    viewYear > today.getUTCFullYear() ||
    (viewYear === today.getUTCFullYear() && viewMonth > today.getUTCMonth());

  const months = [0, 1].map((offset) => {
    const d = new Date(Date.UTC(viewYear, viewMonth + offset, 1));
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 transition-colors hover:bg-ink/5 disabled:opacity-30"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 transition-colors hover:bg-ink/5"
        >
          →
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {months.map(({ year, month }, mi) => (
          <div key={`${year}-${month}`} className={mi === 1 ? "hidden sm:block" : ""}>
            <p className="mb-2 text-center font-display font-semibold">
              {MONTHS[month]} {year}
            </p>
            <div className="grid grid-cols-7 text-center text-xs text-ink/50">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 text-center text-sm">
              {monthGrid(year, month).map((iso, i) => {
                if (!iso) return <div key={i} />;
                const s = cellState(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={s.disabled}
                    onClick={() => pick(iso)}
                    aria-label={iso}
                    aria-pressed={s.isStart || s.isEnd}
                    className={[
                      "relative m-0.5 flex h-9 items-center justify-center rounded-lg transition-colors",
                      s.isStart || s.isEnd
                        ? "bg-accent font-semibold text-white"
                        : s.inRange
                          ? "bg-accent/15 text-accent-dark"
                          : s.disabled
                            ? "text-ink/25 line-through decoration-ink/20"
                            : "hover:bg-accent/10",
                    ].join(" ")}
                  >
                    {Number(iso.slice(8, 10))}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-ink/50">
        Crossed-out dates are already booked (including Airbnb, Booking.com and
        Vrbo). You can check out on a crossed-out day — nights are what count.
      </p>
    </div>
  );
}
