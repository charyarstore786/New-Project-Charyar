import crypto from "crypto";
import { db } from "@/lib/db";
import { getIdentityProvider } from "@/lib/stripe/identity";
import { getPaymentProvider } from "@/lib/stripe/payments";
import { isRangeAvailable, syncExternalBlocks } from "./availability";
import { computeQuote, validateStay } from "./quote";

export type GuestDetails = {
  name: string;
  email: string;
  phone: string;
  country?: string;
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
 * Full booking creation in mock mode: validate → verify ID → authorize
 * payment → transactionally re-check availability and persist. The booking
 * lands in PENDING_APPROVAL, which blocks its dates immediately (site
 * calendar + exported iCal feed) until the host approves or rejects.
 */
export async function createBooking(input: {
  checkIn: unknown;
  checkOut: unknown;
  guests: unknown;
  guest: GuestDetails;
}): Promise<CreateBookingResult> {
  const validated = validateStay(input);
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

  const reference = newReference();

  const verification = await getIdentityProvider().verifyGuest(input.guest);
  if (verification.status === "FAILED") {
    return {
      ok: false,
      error: "We couldn't verify your ID. Please try again or contact us.",
      code: "VERIFICATION_FAILED",
    };
  }

  const quote = computeQuote(stay);

  let payment;
  try {
    payment = await getPaymentProvider().setupBookingPayment({
      totalPence: quote.total,
      guestName: input.guest.name,
      guestEmail: input.guest.email,
      bookingReference: reference,
    });
  } catch (err) {
    console.error("Payment setup failed:", err);
    return {
      ok: false,
      error: "Payment could not be authorized. You have not been charged.",
      code: "PAYMENT_FAILED",
    };
  }

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
          verificationStatus: verification.status,
          idSummary: JSON.stringify(verification.summary),
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
          stripeCustomerId: payment.customerId,
          stripePaymentIntentId: payment.paymentIntentId,
          stripeSetupIntentId: payment.setupIntentId,
        },
      });

      await tx.eventLog.create({
        data: {
          bookingId: created.id,
          type: "BOOKING_CREATED",
          detail: `${quote.checkIn} → ${quote.checkOut}, ${stay.guests} guest(s), total ${quote.total}p, payment authorized (${payment.paymentIntentId})`,
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
