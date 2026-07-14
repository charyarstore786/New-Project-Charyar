import "server-only";
import { site } from "@/lib/site";
import { propertyPrivate } from "@/lib/property-private";

/**
 * Sent the day before arrival (see PLAN.md automations). Repeats the entry
 * details from the confirmation email since guests rarely keep that one open
 * on arrival day.
 */

export type CheckInInstructionsInput = {
  firstName: string;
  checkInDate: string;
};

export function checkInInstructionsSubject(): string {
  return `Check-in tomorrow — ${site.name}`;
}

export function checkInInstructionsText(input: CheckInInstructionsInput): string {
  return `Dear ${input.firstName}

Looking forward to welcoming you tomorrow, ${input.checkInDate}.

Here's everything you need for arrival:

Property Address: ${propertyPrivate.unitAddress}
Check-in: After ${site.checkIn}

${propertyPrivate.entryInstructions}
Key Box Code: ${propertyPrivate.keyBoxCode}

Parking: Free street parking is available. Please avoid parking on double yellow lines or blocking driveways.

A £${site.deposit} damage deposit hold will be placed on your saved card around your arrival — this is a hold, not a charge, and is released automatically after checkout provided the studio is left as found.

Any questions before you arrive, just reply to this email or message us on WhatsApp.

Safe travels!
${site.name}`;
}
