import crypto from "crypto";
import { db } from "@/lib/db";
import { getVerificationStatus, getVerificationSummary } from "@/lib/stripe/identity";
import { isRangeAvailable, syncExternalBlocks } from "./availability";
import { computeQuote, validateStay } from "./quote";

export type GuestDetails = {
  name: string;
  email: string;
  phone: string;
  country?: string;
};

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

function newReference(): string {
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
 * transactionally persists the booking. Lands in PENDING_APPROVAL, which
 * blocks its dates immediately (site calendar + exported iCal feed) until
 * the host approves or rejects.
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
          status: "PENDING_APPROVAL",
          guestId: guest.id,
          stripeCustomerId: input.stripe.customerId,
          stripePaymentIntentId: input.stripe.paymentIntentId,
          stripeSetupIntentId: input.stripe.setupIntentId,
        },
      });

      await tx.eventLog.create({
        data: {
          bookingId: created.id,
          type: "BOOKING_CREATED",
          detail: `${quote.checkIn} → ${quote.checkOut}, ${stay.guests} guest(s), total ${quote.total}p, payment authorized (${input.stripe.paymentIntentId})`,
        },
      });

      return created;
    });

    if (!booking) {
      return {
        ok: false,
        error: "Those dates have just been booked — please pick different dates.",
        code: "UNAVAILABLE",
      };
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
