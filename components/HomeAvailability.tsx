"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Calendar from "@/components/booking/Calendar";

type Availability = {
  blocked: string[];
  horizonDays: number;
  maxNights: number;
};

export default function HomeAvailability() {
  const router = useRouter();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/availability")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setAvailability)
      .catch(() => setLoadError(true));
  }, []);

  function goToBooking() {
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    router.push(`/book${params.toString() ? `?${params.toString()}` : ""}`);
  }

  if (loadError) return null;

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
      {!availability ? (
        <p className="py-10 text-center text-ink/50">Loading live availability…</p>
      ) : (
        <>
          <Calendar
            blocked={new Set(availability.blocked)}
            horizonDays={availability.horizonDays}
            maxNights={availability.maxNights}
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={(ci, co) => {
              setCheckIn(ci);
              setCheckOut(co);
            }}
          />
          <button
            onClick={goToBooking}
            disabled={!checkIn || !checkOut}
            className="btn-fancy mt-6 w-full px-6 py-3 disabled:opacity-40 sm:w-auto"
          >
            {checkIn && checkOut ? "Continue to booking" : "Select your dates"}
          </button>
        </>
      )}
    </div>
  );
}
