import { addDays, toIsoDate, todayUtc } from "@/lib/booking/dates";
import type { ChannelProvider, ExternalBlock } from "./types";

/**
 * Mock provider used when SYMPL_ICAL_URL is not configured. Simulates two
 * OTA bookings in the near future so the calendar visibly greys dates out
 * and the double-booking guard can be exercised locally.
 */
export class MockProvider implements ChannelProvider {
  readonly name = "mock";

  async getBlocks(): Promise<ExternalBlock[]> {
    const today = todayUtc();
    return [
      {
        uid: "mock-airbnb-1",
        start: toIsoDate(addDays(today, 10)),
        end: toIsoDate(addDays(today, 13)),
        summary: "Airbnb booking (mock)",
      },
      {
        uid: "mock-bookingcom-1",
        start: toIsoDate(addDays(today, 21)),
        end: toIsoDate(addDays(today, 23)),
        summary: "Booking.com booking (mock)",
      },
    ];
  }

  async pushBooking(): Promise<void> {}

  async cancelBooking(): Promise<void> {}
}
