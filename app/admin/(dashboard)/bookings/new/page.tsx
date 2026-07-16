import Link from "next/link";
import { getBlockedNights } from "@/lib/booking/availability";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/quote";
import { getPricing } from "@/lib/pricing";
import { IconChevronLeft } from "@/components/admin/icons";
import NewBookingForm from "./NewBookingForm";

export default async function NewBookingPage() {
  const [blocked, pricing] = await Promise.all([getBlockedNights(BOOKING_HORIZON_DAYS), getPricing()]);

  return (
    <div>
      <Link href="/admin/bookings" className="flex items-center gap-1 text-sm text-ink/50 hover:text-gold-dark">
        <IconChevronLeft className="text-xs" /> All bookings
      </Link>
      <p className="admin-eyebrow mt-3">New booking</p>
      <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">Add a booking manually</h1>
      <p className="mt-1.5 text-sm text-ink/50">
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
