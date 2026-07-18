import "server-only";
import { site } from "@/lib/site";

/**
 * Short acknowledgment email — never contains the address or key code (see
 * confirmation.ts for that). Two moments use this:
 * (1) the instant a booking is submitted, while still PENDING_APPROVAL;
 * (2) the instant a booking is approved (auto or by the host) but check-in
 * is more than FULL_DETAILS_WITHIN_DAYS away, so the full check-in details
 * email is deliberately deferred (see lib/booking/create.ts, actions.ts,
 * and the cron job in lib/cron/dailyTasks.ts that sends it closer to
 * arrival).
 */

export type BookingReceivedEmailInput = {
  firstName: string;
  reference: string;
  checkInDate: string;
  checkOutDate: string;
  /** False while still awaiting host review; true once approved/confirmed. */
  approved: boolean;
};

export function bookingReceivedEmailSubject(input: { approved: boolean }): string {
  return input.approved ? `Booking confirmed — ${site.name}` : `We've got your booking request — ${site.name}`;
}

export function bookingReceivedEmailText(input: BookingReceivedEmailInput): string {
  const statusLine = input.approved
    ? "Good news — your booking is confirmed!"
    : "We're reviewing your booking now and you'll hear from us shortly.";

  return `Dear ${input.firstName}

Thank you for booking your stay with ${site.name}.

Reference: ${input.reference}
Arrival: ${input.checkInDate}
Departure: ${input.checkOutDate}

${statusLine} We'll send your full check-in details — address, entry code and parking — closer to your arrival.

Any questions in the meantime, just reply to this email or WhatsApp us on ${site.phone}.

${site.name}`;
}
