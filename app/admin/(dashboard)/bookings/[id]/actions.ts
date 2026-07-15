"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { chargeSavedCard, getPaymentProvider } from "@/lib/stripe/payments";
import { getDepositProvider } from "@/lib/stripe/deposit";
import { getEmailProvider } from "@/lib/email/send";
import { confirmationEmailSubject, confirmationEmailText } from "@/lib/email/templates/confirmation";
import { rejectionEmailSubject, rejectionEmailText } from "@/lib/email/templates/rejection";
import { getPricing } from "@/lib/pricing";

function formatDisplayDate(iso: Date): string {
  return iso.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

async function logEvent(bookingId: string, type: string, detail?: string) {
  await db.eventLog.create({ data: { bookingId, type, detail } });
}

/**
 * Sends an email and logs it, but never throws — a transient provider
 * failure (e.g. an unverified sending domain) must not roll back or 500 an
 * action that already changed booking/payment state. Failures land in the
 * activity log instead, so the host can see and retry (e.g. via "Resend
 * confirmation").
 */
async function sendEmailSafely(input: { bookingId: string; to: string; type: string; subject: string; body: string }) {
  try {
    await getEmailProvider().send({ to: input.to, subject: input.subject, text: input.body });
    await db.emailLog.upsert({
      where: { bookingId_type: { bookingId: input.bookingId, type: input.type } },
      create: { bookingId: input.bookingId, type: input.type, to: input.to, subject: input.subject, body: input.body },
      update: { subject: input.subject, body: input.body, sentAt: new Date() },
    });
  } catch (err) {
    await logEvent(input.bookingId, "EMAIL_SEND_FAILED", `${input.type}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function approveBooking(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.status !== "PENDING_APPROVAL") return;

  if (booking.stripePaymentIntentId) {
    await getPaymentProvider().captureStayPayment(booking.stripePaymentIntentId);
  }

  await db.booking.update({ where: { id: bookingId }, data: { status: "APPROVED" } });
  await logEvent(bookingId, "BOOKING_APPROVED", "Payment captured, guest to receive confirmation email.");

  await sendConfirmationEmail(bookingId);

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

export async function rejectBooking(bookingId: string, reason?: string) {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { guest: true } });
  if (booking.status !== "PENDING_APPROVAL" && booking.status !== "PENDING_VERIFICATION") return;

  if (booking.stripePaymentIntentId) {
    await getPaymentProvider().releaseStayPayment(booking.stripePaymentIntentId);
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "REJECTED", notes: reason || booking.notes },
  });
  await logEvent(bookingId, "BOOKING_REJECTED", reason || "Rejected by host. Authorization released.");

  const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
  await sendEmailSafely({
    bookingId,
    to: booking.guest.email,
    type: "REJECTED",
    subject: rejectionEmailSubject(),
    body: rejectionEmailText({
      firstName,
      checkInDate: formatDisplayDate(booking.checkIn),
      checkOutDate: formatDisplayDate(booking.checkOut),
    }),
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}

export async function sendConfirmationEmail(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { guest: true },
  });

  const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
  await sendEmailSafely({
    bookingId,
    to: booking.guest.email,
    type: "CONFIRMATION",
    subject: confirmationEmailSubject(),
    body: confirmationEmailText({
      firstName,
      checkInDate: formatDisplayDate(booking.checkIn),
      checkOutDate: formatDisplayDate(booking.checkOut),
    }),
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
}

/** Saves a card on file for a booking that didn't collect one online (e.g. a manual booking). */
export async function attachCard(bookingId: string, customerId: string, setupIntentId: string) {
  await db.booking.update({
    where: { id: bookingId },
    data: { stripeCustomerId: customerId, stripeSetupIntentId: setupIntentId },
  });
  await logEvent(bookingId, "CARD_ADDED", "Card on file added by host.");
  revalidatePath(`/admin/bookings/${bookingId}`);
}

/** Host-initiated, on-demand charge of the full stay total against the saved card — entirely optional. */
export async function chargeStayTotal(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (!booking.stripeCustomerId || !booking.stripeSetupIntentId) {
    await logEvent(bookingId, "CHARGE_DECLINED", "No saved card on this booking.");
    revalidatePath(`/admin/bookings/${bookingId}`);
    return;
  }
  if (booking.stripePaymentIntentId) {
    await logEvent(bookingId, "CHARGE_DECLINED", "This booking already has a payment on file.");
    revalidatePath(`/admin/bookings/${bookingId}`);
    return;
  }

  const result = await chargeSavedCard({
    customerId: booking.stripeCustomerId,
    setupIntentId: booking.stripeSetupIntentId,
    amountPence: booking.total,
    bookingReference: booking.reference,
  });

  if (result.status === "charged") {
    await db.booking.update({ where: { id: bookingId }, data: { stripePaymentIntentId: result.paymentIntentId } });
    await logEvent(bookingId, "STAY_CHARGED", `£${(booking.total / 100).toFixed(2)} charged (intent ${result.paymentIntentId}).`);
  } else {
    await logEvent(bookingId, "CHARGE_DECLINED", result.error);
  }
  revalidatePath(`/admin/bookings/${bookingId}`);
}

/** Places the £200 off-session hold on the card saved at booking time. */
export async function placeDeposit(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (!booking.stripeCustomerId || !booking.stripeSetupIntentId) {
    await logEvent(bookingId, "DEPOSIT_HOLD_DECLINED", "No saved card on this booking.");
    revalidatePath(`/admin/bookings/${bookingId}`);
    return;
  }

  const { deposit } = await getPricing();
  const result = await getDepositProvider().placeDepositHold({
    customerId: booking.stripeCustomerId,
    setupIntentId: booking.stripeSetupIntentId,
    amountPence: deposit * 100,
    bookingReference: booking.reference,
  });

  if (result.status === "held" || result.status === "requires_action") {
    await db.booking.update({ where: { id: bookingId }, data: { stripeDepositIntentId: result.depositIntentId } });
    await logEvent(
      bookingId,
      "DEPOSIT_HELD",
      result.status === "requires_action"
        ? `£${deposit} hold placed but requires guest action (intent ${result.depositIntentId}).`
        : `£${deposit} hold placed (intent ${result.depositIntentId}).`,
    );
  } else {
    await logEvent(bookingId, "DEPOSIT_HOLD_DECLINED", result.error);
  }

  revalidatePath(`/admin/bookings/${bookingId}`);
}

/** Host is happy with the property — cancels the hold, guest is never charged. */
export async function releaseDeposit(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (!booking.stripeDepositIntentId) return;

  await getDepositProvider().releaseDepositHold(booking.stripeDepositIntentId);
  await logEvent(bookingId, "DEPOSIT_RELEASED", `Hold ${booking.stripeDepositIntentId} released.`);

  revalidatePath(`/admin/bookings/${bookingId}`);
}

/** Host found damage — captures (part of) the held deposit and records a claim. */
export async function chargeDeposit(bookingId: string, amountPence: number, note: string) {
  if (!Number.isInteger(amountPence) || amountPence <= 0) return;
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (!booking.stripeDepositIntentId) return;

  const { chargeId } = await getDepositProvider().chargeDeposit(booking.stripeDepositIntentId, amountPence);

  await db.damageClaim.create({ data: { bookingId, amount: amountPence, note, stripeChargeId: chargeId } });
  await logEvent(bookingId, "DEPOSIT_CHARGED", `${note} — £${(amountPence / 100).toFixed(2)} (charge ${chargeId})`);

  revalidatePath(`/admin/bookings/${bookingId}`);
}

/** Manual note-only claim — no active card hold to charge (e.g. handled via bank transfer instead). */
export async function addDamageClaim(bookingId: string, amountPence: number, note: string) {
  if (!Number.isInteger(amountPence) || amountPence <= 0) return;
  await db.damageClaim.create({ data: { bookingId, amount: amountPence, note } });
  await logEvent(bookingId, "DAMAGE_CLAIM_ADDED", `${note} — ${amountPence}p`);
  revalidatePath(`/admin/bookings/${bookingId}`);
}

export async function updateBookingStatus(bookingId: string, status: string) {
  await db.booking.update({ where: { id: bookingId }, data: { status } });
  await logEvent(bookingId, "STATUS_CHANGED", `Manually set to ${status}`);
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
}
