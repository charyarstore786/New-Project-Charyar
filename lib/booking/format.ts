// Client-safe pieces split out of quote.ts — quote.ts pulls in lib/pricing.ts
// ("server-only"), which breaks any client component that imports it, even
// transitively just for formatGbp/Quote.

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

/** How far ahead stays can be booked. */
export const BOOKING_HORIZON_DAYS = 540;

/** "£1,234.50" (trims ".00") from pence. */
export function formatGbp(pence: number): string {
  const pounds = pence / 100;
  return pounds.toLocaleString("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pounds % 1 === 0 ? 0 : 2,
  });
}
