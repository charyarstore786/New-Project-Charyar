import "server-only";
import { site } from "@/lib/site";

/** Sent whenever a damage-deposit hold attempt is declined by the card (see lib/cron/dailyTasks.ts and admin placeDeposit). */

export type DepositDeclinedEmailInput = {
  firstName: string;
  deposit: number;
};

export function depositDeclinedEmailSubject(): string {
  return `Action needed: damage deposit hold failed — ${site.name}`;
}

export function depositDeclinedEmailText(input: DepositDeclinedEmailInput): string {
  return `Dear ${input.firstName}

We tried to place the £${input.deposit} refundable damage deposit hold on your saved card, but it didn't go through (the card may have declined it or have insufficient available funds).

This is a hold only, never a charge unless there's damage — but we do need a card that can support it before or during your stay.

Please reply to this email or message us on WhatsApp with a working card, and we'll try again.

${site.name}
${site.email}`;
}
