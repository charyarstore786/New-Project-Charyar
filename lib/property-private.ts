import "server-only";

/**
 * Guest-instruction details that must NEVER reach the browser bundle or the
 * public site — the exact unit address, entry instructions and key box
 * code. These only ever go out server-side, in the confirmation email sent
 * after a booking is host-approved (see lib/email/templates/confirmation.ts).
 *
 * The `server-only` import makes any accidental "use client" import of this
 * module a build-time error instead of a leaked secret.
 */
export const propertyPrivate = {
  unitAddress: process.env.PROPERTY_UNIT_ADDRESS ?? "",
  entryInstructions: process.env.PROPERTY_ENTRY_INSTRUCTIONS ?? "",
  keyBoxCode: process.env.PROPERTY_KEY_BOX_CODE ?? "",
};
