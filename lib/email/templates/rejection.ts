import "server-only";
import { site } from "@/lib/site";

/** Sent when the host rejects a booking (see PLAN.md booking flow, step 7). */

export type RejectionEmailInput = {
  firstName: string;
  checkInDate: string;
  checkOutDate: string;
};

export function rejectionEmailSubject(): string {
  return `About your booking request — ${site.name}`;
}

export function rejectionEmailText(input: RejectionEmailInput): string {
  return `Dear ${input.firstName}

Thank you for your interest in staying with ${site.name} for ${input.checkInDate} to ${input.checkOutDate}.

Unfortunately we're unable to accept this booking request. Your card was never charged — the payment authorization has been released in full, and you should see no charge from us.

We're sorry for the inconvenience, and we'd be glad to help with a future stay if your plans change.

Any questions, just reply to this email or message us on WhatsApp.

${site.name}`;
}
