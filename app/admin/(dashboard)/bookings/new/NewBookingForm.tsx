"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Calendar from "@/components/booking/Calendar";
import { createManualBooking } from "./actions";

type Props = {
  blocked: string[];
  horizonDays: number;
  maxNights: number;
  maxGuests: number;
};

export default function NewBookingForm({ blocked, horizonDays, maxNights, maxGuests }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!checkIn || !checkOut) return setError("Please pick check-in and check-out dates.");

    startTransition(async () => {
      const result = await createManualBooking({
        checkIn,
        checkOut,
        guests,
        name,
        email,
        phone,
        country: country || undefined,
        note: note || undefined,
        sendEmail,
      });
      if (result.ok) {
        router.push(`/admin/bookings/${result.bookingId}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="rounded-2xl border border-ink/10 bg-white p-6">
        <h2 className="font-display text-lg font-semibold">Dates</h2>
        <div className="mt-4">
          <Calendar
            blocked={new Set(blocked)}
            horizonDays={horizonDays}
            maxNights={maxNights}
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => {
              setCheckIn(ci);
              setCheckOut(co);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-ink/10 bg-white p-6">
          <h2 className="font-display text-lg font-semibold">Guest details</h2>
          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium">Guests</span>
              <select
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              >
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} guest{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium">Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 7700 900123"
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Country (optional)</span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United Kingdom"
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Internal note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Booked by phone, paying by bank transfer"
                className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Send the guest a confirmation email
            </label>
          </div>
        </div>

        <button type="submit" disabled={pending} className="btn-fancy px-6 py-3 disabled:opacity-40">
          {pending ? "Saving…" : "Add booking"}
        </button>
        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
        <p className="text-xs text-ink/40">
          No card is charged and no ID check runs — this is for bookings you're handling directly (phone, walk-in,
          bank transfer). It blocks the dates immediately, same as an online booking.
        </p>
      </div>
    </form>
  );
}
