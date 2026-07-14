import { getActiveDeals, getPricing, nightlyRateForNight } from "@/lib/pricing";
import { addDays, nightsBetween, parseIsoDate, todayUtc } from "./dates";
import { BOOKING_HORIZON_DAYS, type Quote, type StayInput } from "./format";

export { BOOKING_HORIZON_DAYS, formatGbp, type Quote, type StayInput } from "./format";

/**
 * Validate raw wizard input into a stay, or return a human-readable error.
 * Availability is checked separately.
 */
export async function validateStay(raw: {
  checkIn?: unknown;
  checkOut?: unknown;
  guests?: unknown;
}): Promise<{ ok: true; stay: StayInput } | { ok: false; error: string }> {
  const fail = (error: string) => ({ ok: false as const, error });
  const pricing = await getPricing();

  const checkIn = parseIsoDate(raw.checkIn);
  const checkOut = parseIsoDate(raw.checkOut);
  if (!checkIn || !checkOut) return fail("Please choose valid check-in and check-out dates.");

  const guests = Number(raw.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > pricing.maxGuests) {
    return fail(`Number of guests must be between 1 and ${pricing.maxGuests}.`);
  }

  const today = todayUtc();
  if (checkIn < today) return fail("Check-in date can't be in the past.");
  if (checkIn > addDays(today, BOOKING_HORIZON_DAYS)) {
    return fail("That's a little too far ahead — please choose dates within the next 18 months.");
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < pricing.minNights) return fail("Check-out must be after check-in.");
  if (nights > pricing.maxNights) {
    return fail(`Stays are limited to ${pricing.maxNights} nights — contact us for longer stays.`);
  }

  return { ok: true, stay: { checkIn, checkOut, guests } };
}

/** Sums each night's rate (base, or an active deal's rate if one covers that night). */
export async function computeQuote(stay: StayInput): Promise<Quote> {
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const pricing = await getPricing();
  const basePence = pricing.nightlyRate * 100;
  const cleaningFee = pricing.cleaningFee * 100;

  const deals = await getActiveDeals(stay.checkIn, stay.checkOut);
  let accommodation = 0;
  for (let n = 0; n < nights; n++) {
    const night = addDays(stay.checkIn, n);
    accommodation += nightlyRateForNight(night, basePence, deals);
  }
  // Display-only average — accommodation/total are the numbers that matter for charging.
  const nightlyRate = Math.round(accommodation / nights);

  return {
    checkIn: stay.checkIn.toISOString().slice(0, 10),
    checkOut: stay.checkOut.toISOString().slice(0, 10),
    guests: stay.guests,
    nights,
    nightlyRate,
    accommodation,
    cleaningFee,
    total: accommodation + cleaningFee,
    deposit: pricing.deposit * 100,
  };
}
