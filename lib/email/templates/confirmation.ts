import "server-only";
import { site } from "@/lib/site";
import { propertyPrivate } from "@/lib/property-private";

/**
 * Booking-confirmation email — sent only after the host approves a
 * booking (see PLAN.md booking flow, step 7). This is the ONLY place the
 * exact unit address and key box code are ever sent to a guest, and it
 * only happens for a specific, approved booking.
 *
 * Not wired to Resend yet — lib/email/send.ts will call this once the
 * email-automation step (PLAN.md implementation order, step 6) is built.
 */

export type ConfirmationEmailInput = {
  firstName: string;
  /** Formatted for display, e.g. "12 August 2026" */
  checkInDate: string;
  checkOutDate: string;
};

export function confirmationEmailSubject(): string {
  return `Your booking is confirmed — ${site.name}`;
}

export function confirmationEmailText(input: ConfirmationEmailInput): string {
  return `Dear ${input.firstName}

Thank you for booking your stay with ${site.name}. We're delighted to host you and look forward to welcoming you soon.

Here are your booking details:

Arrival Date: ${input.checkInDate}
Departure Date: ${input.checkOutDate}
Property Address: ${propertyPrivate.unitAddress}

${propertyPrivate.entryInstructions}
Key Box Code: ${propertyPrivate.keyBoxCode}
Parking: Free street parking is available. Please avoid parking on double yellow lines or blocking driveways.

PROPERTY RULES & GUEST POLICIES
To ensure a safe, comfortable and respectful environment for all guests and neighbours, please review the following:

General Conduct
- No smoking inside the property. Smoking is permitted outside only.
- No pets are allowed.
- Please respect quiet hours between 10:00 PM and 8:00 AM.
- Leave the property in a clean and tidy condition. Excessive mess may incur a cleaning fee.
- Do not move or remove furniture, decor or amenities.
- Report any damages or maintenance issues promptly.

Guest Limits & Visitors
- The booking is valid only for the number of guests specified at the time of reservation.
- No unregistered guests or overnight visitors are allowed without prior approval.
- Parties, gatherings or events are strictly prohibited.
- Any breach of guest limits or hosting events may result in immediate cancellation without refund and potential charges.

Parking
- Free street parking is available on a first-come, first-served basis.
- Do not park on double yellow lines or obstruct driveways.
- The host is not responsible for any damage to your vehicle or theft. Please ensure your car is locked and valuables are not left inside.

Amenities
- Your studio includes a kitchenette, private bathroom, and living/sleeping area.
- We provide linens, towels, basic kitchenware, and Wi-Fi.
- Please do not remove any items from the property.

Check-In & Check-Out
- Check-in: After ${site.checkIn}
- Check-out: By ${site.checkOut}
- Early check-in or late check-out may be available for an additional fee, subject to availability.

Damage Deposit Policy
- A damage deposit may be required prior to arrival. For last-minute bookings, this may be requested via bank transfer.
- Deposits are refunded within 48 hours of departure, pending inspection.

Safety & Compliance
- Do not tamper with smoke detectors or safety equipment.
- Always lock doors and windows when leaving the property.
- Emergency contact details and safety instructions are provided inside the property.

Any questions before you arrive, just reply to this email or message us on WhatsApp.

See you soon!
${site.name}`;
}
