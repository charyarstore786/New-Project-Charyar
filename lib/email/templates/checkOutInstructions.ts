import "server-only";
import { site } from "@/lib/site";

/** Sent checkout morning (see PLAN.md automations). */

export type CheckOutInstructionsInput = {
  firstName: string;
};

export function checkOutInstructionsSubject(): string {
  return `Check-out today — ${site.name}`;
}

export function checkOutInstructionsText(input: CheckOutInstructionsInput): string {
  return `Dear ${input.firstName}

Thank you for staying with ${site.name} — we hope you had a comfortable visit.

Check-out is by ${site.checkOut} today. A quick reminder before you go:

- Please leave the studio in a clean and tidy condition.
- Take your belongings and any rubbish with you.
- Lock the door and return the key to the key box.
- Your £${site.deposit} damage deposit hold will be released automatically within a few days, once the studio has been checked.

Safe travels, and we'd love to host you again.
${site.name}`;
}
