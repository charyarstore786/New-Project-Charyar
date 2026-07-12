"use client";

import { useEffect, useState } from "react";
import Calendar from "./Calendar";
import { formatGbp, type Quote } from "@/lib/booking/quote";
import { site } from "@/lib/site";

type Availability = {
  blocked: string[];
  horizonDays: number;
  minNights: number;
  maxNights: number;
  maxGuests: number;
  nightlyRate: number;
  cleaningFee: number;
  deposit: number;
};

type StepId = "dates" | "details" | "verify" | "pay" | "done";

const STEPS: { id: StepId; label: string }[] = [
  { id: "dates", label: "Dates" },
  { id: "details", label: "Details" },
  { id: "verify", label: "ID check" },
  { id: "pay", label: "Payment" },
];

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,63}(\.[^\s@]{2,24})+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

export default function BookingWizard() {
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [step, setStep] = useState<StepId>("dates");
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guests, setGuests] = useState(2);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [details, setDetails] = useState({ name: "", email: "", phone: "", country: "" });
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setAvailability)
      .catch(() => setLoadError(true));
  }, []);

  const nights =
    checkIn && checkOut
      ? Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000)
      : 0;

  function fmtDate(iso: string) {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  async function confirmDates() {
    if (!checkIn || !checkOut) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn, checkOut, guests }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not price those dates.");
      setQuote(data.quote);
      setStep("details");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function confirmDetails(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (details.name.trim().length < 2) return setError("Please enter your full name.");
    if (!EMAIL_RE.test(details.email.trim())) return setError("Please enter a valid email address.");
    if (!PHONE_RE.test(details.phone.trim())) return setError("Please enter a valid phone number.");
    setStep("verify");
  }

  async function runMockVerification() {
    setBusy(true);
    setError("");
    // Demo mode: simulates the Stripe Identity document check
    await new Promise((r) => setTimeout(r, 1200));
    setVerified(true);
    setBusy(false);
  }

  async function payAndBook() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn,
          checkOut,
          guests,
          guest: {
            name: details.name.trim(),
            email: details.email.trim(),
            phone: details.phone.trim(),
            country: details.country.trim() || undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Booking failed — you have not been charged.");
      setReference(data.reference);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center">
        <p>The booking calendar couldn&apos;t load. Please refresh, or contact us directly:</p>
        <a href={`mailto:${site.email}`} className="mt-2 inline-block font-medium text-accent-dark">
          {site.email}
        </a>
      </div>
    );
  }

  if (!availability) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-ink/50">
        Loading live availability…
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  const summary = quote && (
    <aside className="rounded-2xl border border-ink/10 bg-white p-6">
      <h3 className="font-display text-lg font-semibold">Your stay</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink/60">Check-in</dt>
          <dd className="font-medium">{fmtDate(quote.checkIn)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/60">Check-out</dt>
          <dd className="font-medium">{fmtDate(quote.checkOut)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/60">Guests</dt>
          <dd className="font-medium">{quote.guests}</dd>
        </div>
        <div className="my-3 border-t border-ink/10" />
        <div className="flex justify-between">
          <dt className="text-ink/60">
            {formatGbp(quote.nightlyRate)} × {quote.nights} night{quote.nights > 1 ? "s" : ""}
          </dt>
          <dd>{formatGbp(quote.accommodation)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink/60">Cleaning fee</dt>
          <dd>{formatGbp(quote.cleaningFee)}</dd>
        </div>
        <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatGbp(quote.total)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-ink/50">
        A {formatGbp(quote.deposit)} refundable damage deposit is held on your
        card on check-in day — never charged unless there is damage.
      </p>
    </aside>
  );

  return (
    <div>
      {/* Step indicator */}
      {step !== "done" && (
        <ol className="mb-8 flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li
              key={s.id}
              className={[
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm",
                i === stepIndex
                  ? "bg-ink font-medium text-white"
                  : i < stepIndex
                    ? "bg-accent/10 text-accent-dark"
                    : "bg-ink/5 text-ink/40",
              ].join(" ")}
            >
              <span>{i < stepIndex ? "✓" : i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {step === "dates" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-ink/10 bg-white p-6">
            <Calendar
              blocked={new Set(availability.blocked)}
              horizonDays={availability.horizonDays}
              maxNights={availability.maxNights}
              checkIn={checkIn}
              checkOut={checkOut}
              onChange={(ci, co) => {
                setCheckIn(ci);
                setCheckOut(co);
                setError("");
              }}
            />
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-ink/10 bg-white p-6">
              <label htmlFor="guests" className="text-sm font-medium">
                Guests
              </label>
              <select
                id="guests"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-ink/20 px-4 py-2.5 text-sm outline-none focus:border-accent"
              >
                {Array.from({ length: availability.maxGuests }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} guest{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>

              <div className="mt-5 space-y-1 text-sm">
                <p>
                  <span className="text-ink/60">Check-in:</span>{" "}
                  <span className="font-medium">{checkIn ? fmtDate(checkIn) : "select a date"}</span>
                </p>
                <p>
                  <span className="text-ink/60">Check-out:</span>{" "}
                  <span className="font-medium">{checkOut ? fmtDate(checkOut) : "select a date"}</span>
                </p>
              </div>

              {nights > 0 && (
                <div className="mt-4 space-y-1 border-t border-ink/10 pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink/60">
                      {formatGbp(availability.nightlyRate)} × {nights} night{nights > 1 ? "s" : ""}
                    </span>
                    <span>{formatGbp(availability.nightlyRate * nights)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/60">Cleaning fee</span>
                    <span>{formatGbp(availability.cleaningFee)}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-semibold">
                    <span>Total</span>
                    <span>{formatGbp(availability.nightlyRate * nights + availability.cleaningFee)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={confirmDates}
              disabled={!checkIn || !checkOut || busy}
              className="btn-fancy px-6 py-3 disabled:opacity-40"
            >
              {busy ? "Checking…" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {step === "details" && quote && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <form
            onSubmit={confirmDetails}
            className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8"
          >
            <h2 className="font-display text-xl font-semibold">Your details</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "Full name", "text", "Jane Smith", true],
                  ["email", "Email", "email", "jane@example.com", true],
                  ["phone", "Phone", "tel", "+44 7700 900123", true],
                  ["country", "Country (optional)", "text", "United Kingdom", false],
                ] as const
              ).map(([key, label, type, placeholder, required]) => (
                <div key={key} className={key === "name" ? "sm:col-span-2" : ""}>
                  <label htmlFor={key} className="text-sm font-medium">
                    {label}
                  </label>
                  <input
                    id={key}
                    type={type}
                    required={required}
                    maxLength={120}
                    placeholder={placeholder}
                    value={details[key]}
                    onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-ink/20 px-4 py-2.5 text-sm outline-none focus:border-accent"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("dates")}
                className="rounded-full border border-ink/20 px-6 py-3 font-medium transition-colors hover:bg-ink/5"
              >
                Back
              </button>
              <button type="submit" className="btn-fancy px-6 py-3">
                Continue
              </button>
            </div>
          </form>
          {summary}
        </div>
      )}

      {step === "verify" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">Quick ID check</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/70">
              For everyone&apos;s safety we ask the lead guest to verify a photo
              ID (passport, driving licence or national ID). It takes about a
              minute, your document is processed securely by our verification
              partner, and it is never stored on our servers.
            </p>

            <div className="mt-6 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
              <p className="font-medium text-accent-dark">Demo mode</p>
              <p className="mt-1 text-ink/70">
                This preview site simulates the ID check. On the live site this
                step opens the secure document scanner.
              </p>
            </div>

            {verified ? (
              <p className="mt-6 flex items-center gap-2 font-medium text-green-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">✓</span>
                ID verified — thanks, {details.name.split(" ")[0]}!
              </p>
            ) : (
              <button
                onClick={runMockVerification}
                disabled={busy}
                className="btn-fancy mt-6 px-6 py-3 disabled:opacity-40"
              >
                {busy ? "Checking document…" : "Verify my ID (demo)"}
              </button>
            )}

            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="rounded-full border border-ink/20 px-6 py-3 font-medium transition-colors hover:bg-ink/5"
              >
                Back
              </button>
              {verified && (
                <button onClick={() => setStep("pay")} className="btn-fancy px-6 py-3">
                  Continue to payment
                </button>
              )}
            </div>
          </div>
          {summary}
        </div>
      )}

      {step === "pay" && quote && (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">Payment</h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-ink/70">
              Your card is <strong>authorized, not charged</strong> — payment of{" "}
              {formatGbp(quote.total)} is only taken once the host confirms your
              booking (usually within a few hours). If it can&apos;t be
              confirmed, the authorization is released in full.
            </p>

            <div className="mt-6 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-5 text-sm">
              <p className="font-medium text-accent-dark">Demo mode</p>
              <p className="mt-1 text-ink/70">
                This preview site simulates the card payment. On the live site
                this step shows the secure Stripe card form.
              </p>
            </div>

            <div className="mt-6 grid max-w-sm gap-3 opacity-60">
              <input
                disabled
                value="4242 4242 4242 4242"
                aria-label="Card number (demo)"
                className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input disabled value="12 / 30" aria-label="Expiry (demo)" className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm" />
                <input disabled value="123" aria-label="CVC (demo)" className="rounded-xl border border-ink/20 px-4 py-2.5 text-sm" />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStep("verify")}
                disabled={busy}
                className="rounded-full border border-ink/20 px-6 py-3 font-medium transition-colors hover:bg-ink/5 disabled:opacity-40"
              >
                Back
              </button>
              <button onClick={payAndBook} disabled={busy} className="btn-fancy px-6 py-3 disabled:opacity-40">
                {busy ? "Authorizing…" : `Authorize ${formatGbp(quote.total)} & request booking`}
              </button>
            </div>
          </div>
          {summary}
        </div>
      )}

      {step === "done" && quote && (
        <div className="mx-auto max-w-xl rounded-2xl border border-ink/10 bg-white p-8 text-center sm:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
            ✓
          </span>
          <h2 className="mt-5 font-display text-2xl font-semibold">Booking requested!</h2>
          <p className="mt-3 text-ink/70">
            Your reference is{" "}
            <span className="rounded-lg bg-ink/5 px-2 py-0.5 font-mono font-semibold text-ink">
              {reference}
            </span>
          </p>
          <div className="mt-6 space-y-2 text-left text-sm text-ink/70">
            <p>
              <strong className="text-ink">{fmtDate(quote.checkIn)} → {fmtDate(quote.checkOut)}</strong>{" "}
              · {quote.guests} guest{quote.guests > 1 ? "s" : ""} · {formatGbp(quote.total)}
            </p>
            <p>
              The host is reviewing your request now. Once confirmed (usually
              within a few hours) your card is charged and your confirmation
              email arrives at <strong className="text-ink">{details.email.trim()}</strong>,
              with check-in instructions following the day before you arrive.
            </p>
            <p>
              If the booking can&apos;t be confirmed, the payment authorization
              is released in full and you&apos;ll be notified straight away.
            </p>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
