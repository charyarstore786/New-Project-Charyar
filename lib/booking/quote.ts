import { site } from "@/lib/site";
import { addDays, nightsBetween, parseIsoDate, todayUtc } from "./dates";

/** How far ahead stays can be booked. */
export const BOOKING_HORIZON_DAYS = 540;

export type Quote = {
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  /** All money in pence */
  nightlyRate: number;
  accommodation: number;
  cleaningFee: number;
  total: number;
  /** Held on card at check-in, never charged unless there is damage */
  deposit: number;
};

export type StayInput = { checkIn: Date; checkOut: Date; guests: number };

/**
 * Validate raw wizard input into a stay, or return a human-readable error.
 * Availability is checked separately.
 */
export function validateStay(raw: {
  checkIn?: unknown;
  checkOut?: unknown;
  guests?: unknown;
}): { ok: true; stay: StayInput } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error });

  const checkIn = parseIsoDate(raw.checkIn);
  const checkOut = parseIsoDate(raw.checkOut);
  if (!checkIn || !checkOut) return fail("Please choose valid check-in and check-out dates.");

  const guests = Number(raw.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > site.maxGuests) {
    return fail(`Number of guests must be between 1 and ${site.maxGuests}.`);
  }

  const today = todayUtc();
  if (checkIn < today) return fail("Check-in date can't be in the past.");
  if (checkIn > addDays(today, BOOKING_HORIZON_DAYS)) {
    return fail("That's a little too far ahead — please choose dates within the next 18 months.");
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights < site.minNights) return fail("Check-out must be after check-in.");
  if (nights > site.maxNights) {
    return fail(`Stays are limited to ${site.maxNights} nights — contact us for longer stays.`);
  }

  return { ok: true, stay: { checkIn, checkOut, guests } };
}

export function computeQuote(stay: StayInput): Quote {
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const nightlyRate = site.nightlyRate * 100;
  const cleaningFee = site.cleaningFee * 100;
  const accommodation = nightlyRate * nights;
  return {
    checkIn: stay.checkIn.toISOString().slice(0, 10),
    checkOut: stay.checkOut.toISOString().slice(0, 10),
    guests: stay.guests,
    nights,
    nightlyRate,
    accommodation,
    cleaningFee,
    total: accommodation + cleaningFee,
    deposit: site.deposit * 100,
  };
}

/** "£1,234.50" (trims ".00") from pence. */
export function formatGbp(pence: number): string {
  const pounds = pence / 100;
  return pounds.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pounds % 1 === 0 ? 0 : 2,
  });
}
