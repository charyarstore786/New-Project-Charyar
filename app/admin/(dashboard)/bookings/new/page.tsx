import Link from "next/link";
import { getBlockedNights } from "@/lib/booking/availability";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/quote";
import { getPricing } from "@/lib/pricing";
import NewBookingForm from "./NewBookingForm";

export default async function NewBookingPage() {
  const [blocked, pricing] = await Promise.all([getBlockedNights(BOOKING_HORIZON_DAYS), getPricing()]);

  return (
    <div>
      <Link href="/admin/bookings" className="text-sm text-ink/50 hover:underline">
        ← All bookings
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold">Add a booking manually</h1>
      <p className="mt-1 text-sm text-ink/50">
        For guests you're booking directly by phone, WhatsApp or in person.
      </p>

      <div className="mt-6">
        <NewBookingForm
          blocked={blocked}
          horizonDays={BOOKING_HORIZON_DAYS}
          maxNights={pricing.maxNights}
          maxGuests={pricing.maxGuests}
        />
      </div>
    </div>
  );
}
