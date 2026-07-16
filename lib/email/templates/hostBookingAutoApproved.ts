import "server-only";
import { site } from "@/lib/site";

/** Sent to the host when a booking is auto-approved because the guest is beyond the 20-mile radius (or the address couldn't be resolved) — see lib/booking/create.ts. */

export type HostBookingAutoApprovedInput = {
  reference: string;
  guestName: string;
  guestAddress: string | null;
  checkInDate: string;
  checkOutDate: string;
  total: string;
  distanceMiles: number | null;
  bookingUrl: string;
};

export function hostBookingAutoApprovedSubject(input: { reference: string }): string {
  return `Booking auto-approved — ${input.reference}`;
}

export function hostBookingAutoApprovedText(input: HostBookingAutoApprovedInput): string {
  return `A new booking was auto-approved and charged — no action needed unless something looks off:

Reference: ${input.reference}
Guest: ${input.guestName}
Address: ${input.guestAddress || "not provided"}
Dates: ${input.checkInDate} → ${input.checkOutDate}
Total: ${input.total}
${input.distanceMiles !== null ? `Distance from property: ~${input.distanceMiles} miles (beyond your 20-mile manual-approval radius)` : "Distance from property: couldn't be determined, so it defaulted to auto-approved"}

View the booking here:
${input.bookingUrl}

${site.name}`;
}
