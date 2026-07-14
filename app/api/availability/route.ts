import { NextResponse } from "next/server";
import { getBlockedNights } from "@/lib/booking/availability";
import { BOOKING_HORIZON_DAYS } from "@/lib/booking/quote";
import { getPricing } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Calendar data for the booking wizard: every unavailable night (own bookings
 * + Sympl-synced OTA blocks) plus the pricing/stay constraints the picker needs.
 */
export async function GET() {
  const [blocked, pricing] = await Promise.all([getBlockedNights(BOOKING_HORIZON_DAYS), getPricing()]);
  return NextResponse.json({
    blocked,
    horizonDays: BOOKING_HORIZON_DAYS,
    minNights: pricing.minNights,
    maxNights: pricing.maxNights,
    maxGuests: pricing.maxGuests,
    nightlyRate: pricing.nightlyRate * 100,
    cleaningFee: pricing.cleaningFee * 100,
    deposit: pricing.deposit * 100,
  });
}
