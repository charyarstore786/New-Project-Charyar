import { NextResponse } from "next/server";
import { getBlockedNights } from "@/lib/booking/availability";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/quote";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Calendar data for the booking wizard: every unavailable night (own bookings
 * + Sympl-synced OTA blocks) plus the pricing/stay constraints the picker needs.
 */
export async function GET() {
  const blocked = await getBlockedNights(BOOKING_HORIZON_DAYS);
  return NextResponse.json({
    blocked,
    horizonDays: BOOKING_HORIZON_DAYS,
    minNights: site.minNights,
    maxNights: site.maxNights,
    maxGuests: site.maxGuests,
    nightlyRate: site.nightlyRate * 100,
    cleaningFee: site.cleaningFee * 100,
    deposit: site.deposit * 100,
  });
}
