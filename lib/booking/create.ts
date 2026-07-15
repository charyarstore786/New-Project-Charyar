import crypto from "crypto";
import { db } from "@/lib/db";
import { getVerificationStatus, getVerificationSummary } from "@/lib/stripe/identity";
import { getPaymentProvider } from "@/lib/stripe/payments";
import { getEmailProvider } from "@/lib/email/send";
import { getGeocodingProvider, milesFromProperty, APPROVAL_RADIUS_MILES } from "@/lib/geo";
import { confirmationEmailSubject, confirmationEmailText } from "@/lib/email/templates/confirmation";
import { hostBookingNeedsApprovalSubject, hostBookingNeedsApprovalText } from "@/lib/email/templates/hostBookingNeedsApproval";
import { hostBookingAutoApprovedSubject, hostBookingAutoApprovedText } from "@/lib/email/templates/hostBookingAutoApproved";
import { formatGbp } from "./format";
import { site } from "@/lib/site";
import { isRangeAvailable, syncExternalBlocks } from "./availability";
import { computeQuote, validateStay } from "./quote";

export type GuestDetails = {
  name: string;
  email: string;
  phone: string;
  country?: string;
  /** Full address as typed by the guest — used once to geocode a distance from the property (see lib/geo.ts). */
  address: string;
};

function formatDisplayDate(iso: Date): string {
  return iso.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Never lets a notification-email failure break booking creation — logged, not thrown. */
async function notifyHostSafely(subject: string, body: string) {
  try {
    await getEmailProvider().send({ to: site.email, subject, text: body });
  } catch (err) {
    console.error("Host notification email failed:", err);
  }
}

/** IDs from the client-driven Stripe.js steps that ran before this call
 * (see /api/stripe/customer, /identity-session, /setup-intent, /payment-intent). */
export type StripeContext = {
  customerId: string;
  setupIntentId: string;
  paymentIntentId: string;
  verificationSessionId: string;
};

export type CreateBookingResult =
  | { ok: true; reference: string; status: string }
  | { ok: false; error: string; code: "INVALID" | "UNAVAILABLE" | "VERIFICATION_FAILED" | "PAYMENT_FAILED" };

// Unambiguous alphabet (no 0/O, 1/I/L) for guest-facing references
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newReference(): string {
  return (
    "NS-" +
    Array.from(crypto.randomBytes(6))
      .map((b) => REF_ALPHABET[b % REF_ALPHABET.length])
      .join("")
  );
}

/**
 * Finalizes a booking after the guest has already completed ID verification
 * and card authorization client-side via Stripe.js (see BookingWizard.tsx).
 * This re-checks availability and the verification result server-side, then
 * transactionally persists the booking. Either way, it blocks its dates
 * immediately (site calendar + exported iCal feed):
 * - Guest beyond APPROVAL_RADIUS_MILES of the property (or an address we
 *   couldn't geocode) → auto-approved, payment captured immediately, same as
 *   the host clicking Approve themselves.
 * - Guest within the radius → PENDING_APPROVAL as before, waiting on the
 *   host to approve or reject.
 */
export async function createBooking(input: {
  checkIn: unknown;
  checkOut: unknown;
  guests: unknown;
  guest: GuestDetails;
  stripe: StripeContext;
}): Promise<CreateBookingResult> {
  const validated = await validateStay(input);
  if (!validated.ok) return { ok: false, error: validated.error, code: "INVALID" };
  const stay = validated.stay;

  // First availability gate before touching external services
  await syncExternalBlocks();
  if (!(await isRangeAvailable(stay.checkIn, stay.checkOut))) {
    return {
      ok: false,
      error: "Those dates have just been booked — please pick different dates.",
      code: "UNAVAILABLE",
    };
  }

  let verificationStatus: string;
  try {
    verificationStatus = await getVerificationStatus(input.stripe.verificationSessionId);
  } catch (err) {
    console.error("Could not check ID verification status:", err);
    return {
      ok: false,
      error: "We couldn't confirm your ID verification. Please try again.",
      code: "VERIFICATION_FAILED",
    };
  }
  if (verificationStatus !== "verified") {
    return {
      ok: false,
      error:
        verificationStatus === "processing"
          ? "Your ID is still being verified — please wait a moment and try again."
          : "We couldn't verify your ID. Please try again or contact us.",
      code: "VERIFICATION_FAILED",
    };
  }
  const idSummary = await getVerificationSummary(input.stripe.verificationSessionId, input.guest.name);

  // Distance-based auto-approval, resolved once before the transaction so
  // the initial status is right from the start. An address that can't be
  // geocoded defaults to auto-approve (assumed far away) rather than
  // blocking the booking.
  const geocoded = await getGeocodingProvider().geocode(input.guest.address);
  const distanceMiles = geocoded ? Math.round(milesFromProperty(geocoded) * 10) / 10 : null;
  const autoApprove = distanceMiles === null || distanceMiles > APPROVAL_RADIUS_MILES;

  const reference = newReference();
  const quote = await computeQuote(stay);

  try {
    const booking = await db.$transaction(async (tx) => {
      // Second guard inside the transaction (PLAN.md): catches a race where
      // the same dates were booked while ID/payment were in flight.
      if (!(await isRangeAvailable(stay.checkIn, stay.checkOut, tx))) return null;

      const guest = await tx.guest.create({
        data: {
          name: input.guest.name,
          email: input.guest.email,
          phone: input.guest.phone,
          country: input.guest.country || null,
          address: input.guest.address,
          verificationStatus: "VERIFIED",
          idSummary: JSON.stringify(idSummary),
        },
      });

      const created = await tx.booking.create({
        data: {
          reference,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          guests: stay.guests,
          nightlyRate: quote.nightlyRate,
          nights: quote.nights,
          cleaningFee: quote.cleaningFee,
          total: quote.total,
          status: autoApprove ? "APPROVED" : "PENDING_APPROVAL",
          guestId: guest.id,
          stripeCustomerId: input.stripe.customerId,
          stripePaymentIntentId: input.stripe.paymentIntentId,
          stripeSetupIntentId: input.stripe.setupIntentId,
        },
      });

      const distanceNote =
        distanceMiles !== null ? ` ~${distanceMiles} miles from property.` : " Distance could not be determined.";
      await tx.eventLog.create({
        data: {
          bookingId: created.id,
          type: "BOOKING_CREATED",
          detail: `${quote.checkIn} → ${quote.checkOut}, ${stay.guests} guest(s), total ${quote.total}p, payment authorized (${input.stripe.paymentIntentId}).${distanceNote}`,
        },
      });

      if (autoApprove) {
        await tx.eventLog.create({
          data: {
            bookingId: created.id,
            type: "BOOKING_AUTO_APPROVED",
            detail:
              distanceMiles !== null
                ? `Auto-approved — ~${distanceMiles} miles from property (beyond the ${APPROVAL_RADIUS_MILES}-mile radius).`
                : "Auto-approved — guest address could not be geocoded, so it defaulted to auto-approve.",
          },
        });
      }

      return created;
    });

    if (!booking) {
      return {
        ok: false,
        error: "Those dates have just been booked — please pick different dates.",
        code: "UNAVAILABLE",
      };
    }

    const bookingUrl = `${site.url.replace(/\/$/, "")}/admin/bookings/${booking.id}`;
    const checkInDate = formatDisplayDate(stay.checkIn);
    const checkOutDate = formatDisplayDate(stay.checkOut);

    if (autoApprove) {
      // Auto-approval should behave exactly like the host clicking Approve
      // themselves: capture the already-authorized stay total right away.
      try {
        await getPaymentProvider().captureStayPayment(input.stripe.paymentIntentId);
      } catch (err) {
        console.error("Auto-approval payment capture failed:", err);
      }

      const firstName = input.guest.name.split(" ")[0] || input.guest.name;
      const subject = confirmationEmailSubject();
      const body = confirmationEmailText({ firstName, checkInDate, checkOutDate });
      try {
        await getEmailProvider().send({ to: input.guest.email, subject, text: body });
        await db.emailLog.create({ data: { bookingId: booking.id, type: "CONFIRMATION", to: input.guest.email, subject, body } });
      } catch (err) {
        console.error("Guest confirmation email failed:", err);
      }

      await notifyHostSafely(
        hostBookingAutoApprovedSubject({ reference: booking.reference }),
        hostBookingAutoApprovedText({
          reference: booking.reference,
          guestName: input.guest.name,
          checkInDate,
          checkOutDate,
          total: formatGbp(quote.total),
          distanceMiles,
          bookingUrl,
        }),
      );
    } else {
      await notifyHostSafely(
        hostBookingNeedsApprovalSubject({ reference: booking.reference }),
        hostBookingNeedsApprovalText({
          reference: booking.reference,
          guestName: input.guest.name,
          checkInDate,
          checkOutDate,
          distanceMiles,
          bookingUrl,
        }),
      );
    }

    return { ok: true, reference: booking.reference, status: booking.status };
  } catch (err) {
    console.error("Booking creation failed:", err);
    return {
      ok: false,
      error: "Something went wrong saving your booking. You have not been charged — please try again.",
      code: "PAYMENT_FAILED",
    };
  }
}
