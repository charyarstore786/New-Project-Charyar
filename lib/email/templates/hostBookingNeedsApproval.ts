import "server-only";
import { site } from "@/lib/site";

/** Sent to the host the moment a booking lands in PENDING_APPROVAL — the guest is within the 20-mile approval radius (see lib/booking/create.ts). */

export type HostBookingNeedsApprovalInput = {
  reference: string;
  guestName: string;
  guestAddress: string | null;
  checkInDate: string;
  checkOutDate: string;
  distanceMiles: number | null;
  bookingUrl: string;
};

export function hostBookingNeedsApprovalSubject(input: { reference: string }): string {
  return `Booking needs your approval — ${input.reference}`;
}

export function hostBookingNeedsApprovalText(input: HostBookingNeedsApprovalInput): string {
  return `A new booking needs your approval:

Reference: ${input.reference}
Guest: ${input.guestName}
Address: ${input.guestAddress || "not provided"}
Dates: ${input.checkInDate} → ${input.checkOutDate}
${input.distanceMiles !== null ? `Distance from property: ~${input.distanceMiles} miles (within your 20-mile manual-approval radius)` : "Distance from property: could not be determined"}

Review and approve or reject here:
${input.bookingUrl}

${site.name}`;
}
