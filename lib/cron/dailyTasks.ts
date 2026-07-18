// Daily automation tasks (see PLAN.md "Automations"). Run once a day from
// app/api/cron/daily/route.ts. Each function is independently idempotent —
// safe to re-run the same day without double-sending emails or double-
// charging cards — so a retried or overlapping cron invocation is harmless.

import "server-only";
import { db } from "@/lib/db";
import { getPricing } from "@/lib/pricing";
import { getDepositProvider } from "@/lib/stripe/deposit";
import { getPaymentProvider } from "@/lib/stripe/payments";
import { getEmailProvider, guestReplyTo } from "@/lib/email/send";
import { deriveDepositStatus } from "@/lib/booking/depositStatus";
import { checkInInstructionsSubject, checkInInstructionsText } from "@/lib/email/templates/checkInInstructions";
import { checkOutInstructionsSubject, checkOutInstructionsText } from "@/lib/email/templates/checkOutInstructions";
import { rejectionEmailSubject, rejectionEmailText } from "@/lib/email/templates/rejection";
import { depositDeclinedEmailSubject, depositDeclinedEmailText } from "@/lib/email/templates/depositDeclined";
import { reviewRequestEmailSubject, reviewRequestEmailText } from "@/lib/email/templates/reviewRequest";
import { FULL_DETAILS_WITHIN_DAYS } from "@/lib/booking/create";

const AUTO_RELEASE_AFTER_CHECKOUT_HOURS = 24;
const AUTO_CANCEL_AFTER_PENDING_DAYS = 6;
const GDPR_PURGE_AFTER_CHECKOUT_DAYS = 30;
const REVIEW_REQUEST_AFTER_CHECKOUT_DAYS = 2;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 60 * 60 * 1000);
}

function formatDisplayDate(iso: Date): string {
  return iso.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

async function logEvent(bookingId: string, type: string, detail?: string) {
  await db.eventLog.create({ data: { bookingId, type, detail } });
}

type TaskSummary = { processed: number; errors: string[] };

/**
 * Attempts one deposit hold and handles the result — held (saves the intent
 * id) or declined (logs it and emails the guest asking for a working card).
 * Shared by the check-in-day attempt and the daily retry, so a guest who
 * tops up their card gets picked up the same way either time.
 */
async function attemptDepositHold(
  booking: {
    id: string;
    reference: string;
    stripeCustomerId: string;
    stripeSetupIntentId: string;
    guest: { name: string; email: string };
  },
  depositAmount: number,
  attemptLabel: string,
): Promise<void> {
  const result = await getDepositProvider().placeDepositHold({
    customerId: booking.stripeCustomerId,
    setupIntentId: booking.stripeSetupIntentId,
    amountPence: depositAmount * 100,
    bookingReference: booking.reference,
  });

  if (result.status === "held" || result.status === "requires_action") {
    await db.booking.update({ where: { id: booking.id }, data: { stripeDepositIntentId: result.depositIntentId } });
    await logEvent(booking.id, "DEPOSIT_HELD", `£${depositAmount} hold placed (intent ${result.depositIntentId}) via ${attemptLabel}.`);
    return;
  }

  await logEvent(booking.id, "DEPOSIT_HOLD_DECLINED", `${result.error} (${attemptLabel}).`);
  const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
  const subject = depositDeclinedEmailSubject();
  const body = depositDeclinedEmailText({ firstName, deposit: depositAmount });
  try {
    await getEmailProvider().send({ to: booking.guest.email, subject, text: body, replyTo: guestReplyTo(booking.id) });
    await db.emailLog.upsert({
      where: { bookingId_type: { bookingId: booking.id, type: "DEPOSIT_DECLINED" } },
      create: { bookingId: booking.id, type: "DEPOSIT_DECLINED", to: booking.guest.email, subject, body },
      update: { subject, body, sentAt: new Date() },
    });
  } catch (emailErr) {
    await logEvent(booking.id, "EMAIL_SEND_FAILED", `DEPOSIT_DECLINED: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}`);
  }
}

/** Places the £200 deposit hold for bookings checking in today. */
export async function placeDepositsForCheckIns(): Promise<TaskSummary> {
  const today = startOfUtcDay(new Date());
  const tomorrow = addDays(today, 1);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: { status: { in: ["APPROVED", "CHECKED_IN"] }, checkIn: { gte: today, lt: tomorrow } },
    include: { guest: true },
  });
  if (candidates.length === 0) return summary;
  const pricing = await getPricing();

  for (const booking of candidates) {
    try {
      const events = await db.eventLog.findMany({ where: { bookingId: booking.id } });
      if (deriveDepositStatus(events) !== "NONE") continue;
      if (!booking.stripeCustomerId || !booking.stripeSetupIntentId) {
        await logEvent(booking.id, "DEPOSIT_HOLD_DECLINED", "No saved card on this booking.");
        continue;
      }

      await attemptDepositHold(
        {
          id: booking.id,
          reference: booking.reference,
          stripeCustomerId: booking.stripeCustomerId,
          stripeSetupIntentId: booking.stripeSetupIntentId,
          guest: booking.guest,
        },
        pricing.deposit,
        "check-in cron",
      );
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/**
 * Retries a previously-declined deposit hold once a day for any booking
 * still ongoing (not yet checked out) — e.g. the guest topped up their card
 * or added a new one after the first attempt failed. Skips bookings already
 * attempted today so it never doubles up with placeDepositsForCheckIns on a
 * check-in day.
 */
export async function retryDeclinedDeposits(): Promise<TaskSummary> {
  const today = startOfUtcDay(new Date());
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: {
      status: { in: ["APPROVED", "CHECKED_IN"] },
      checkOut: { gt: today },
      stripeCustomerId: { not: null },
      stripeSetupIntentId: { not: null },
    },
    include: { guest: true },
  });
  if (candidates.length === 0) return summary;
  const { deposit } = await getPricing();

  for (const booking of candidates) {
    try {
      const events = await db.eventLog.findMany({ where: { bookingId: booking.id } });
      if (deriveDepositStatus(events) !== "DECLINED") continue;

      const alreadyAttemptedToday = events.some(
        (e) => (e.type === "DEPOSIT_HELD" || e.type === "DEPOSIT_HOLD_DECLINED") && e.createdAt >= today,
      );
      if (alreadyAttemptedToday) continue;

      await attemptDepositHold(
        {
          id: booking.id,
          reference: booking.reference,
          stripeCustomerId: booking.stripeCustomerId!,
          stripeSetupIntentId: booking.stripeSetupIntentId!,
          guest: booking.guest,
        },
        deposit,
        "daily retry",
      );
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/**
 * Auto-releases deposit holds 24 hours after checkout if the host took no
 * action. Uses an exact elapsed-time cutoff (not day-snapped) so it releases
 * as close to the 24-hour mark as this once-daily cron allows.
 */
export async function autoReleaseDeposits(): Promise<TaskSummary> {
  const cutoff = new Date(Date.now() - AUTO_RELEASE_AFTER_CHECKOUT_HOURS * 60 * 60 * 1000);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: { checkOut: { lte: cutoff }, stripeDepositIntentId: { not: null } },
  });

  for (const booking of candidates) {
    try {
      const events = await db.eventLog.findMany({ where: { bookingId: booking.id } });
      if (deriveDepositStatus(events) !== "HELD") continue;

      await getDepositProvider().releaseDepositHold(booking.stripeDepositIntentId!);
      await logEvent(booking.id, "DEPOSIT_RELEASED", `Hold ${booking.stripeDepositIntentId} auto-released ${AUTO_RELEASE_AFTER_CHECKOUT_HOURS} hours after checkout.`);
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/**
 * Sends full check-in details (address, entry code) once a booking is
 * within FULL_DETAILS_WITHIN_DAYS of arrival, for any approved booking that
 * hasn't received them yet — either because it was approved further out
 * (see lib/booking/create.ts and the admin approveBooking action, which
 * defer full details the same way) or because a previous run of this cron
 * was missed. The emails:none guard covers both CHECK_IN_INSTRUCTIONS
 * (this email) and CONFIRMATION (the immediate version for near-term
 * bookings), so nobody gets full details twice.
 */
export async function sendCheckInInstructions(): Promise<TaskSummary> {
  const today = startOfUtcDay(new Date());
  const cutoff = addDays(today, FULL_DETAILS_WITHIN_DAYS + 1);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: {
      status: { in: ["APPROVED", "CHECKED_IN"] },
      checkIn: { gte: today, lt: cutoff },
      emails: { none: { type: { in: ["CHECK_IN_INSTRUCTIONS", "CONFIRMATION"] } } },
    },
    include: { guest: true },
  });

  if (candidates.length === 0) return summary;
  const { deposit } = await getPricing();

  for (const booking of candidates) {
    try {
      const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
      const subject = checkInInstructionsSubject();
      const body = checkInInstructionsText({ firstName, checkInDate: formatDisplayDate(booking.checkIn), deposit });

      await getEmailProvider().send({ to: booking.guest.email, subject, text: body, replyTo: guestReplyTo(booking.id) });
      await db.emailLog.create({ data: { bookingId: booking.id, type: "CHECK_IN_INSTRUCTIONS", to: booking.guest.email, subject, body } });
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/**
 * Sends check-out instructions on checkout day. Timing relative to the
 * 10:00 AM checkout time is controlled by the cron's own schedule (see
 * vercel.json — runs at 05:00 UTC, ~5 hours ahead of local checkout),
 * since there's only one daily cron run and every checkout time is the same.
 */
export async function sendCheckOutInstructions(): Promise<TaskSummary> {
  const today = startOfUtcDay(new Date());
  const tomorrow = addDays(today, 1);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: {
      status: { in: ["APPROVED", "CHECKED_IN", "CHECKED_OUT"] },
      checkOut: { gte: today, lt: tomorrow },
      emails: { none: { type: "CHECK_OUT_INSTRUCTIONS" } },
    },
    include: { guest: true },
  });

  if (candidates.length === 0) return summary;
  const { deposit } = await getPricing();

  for (const booking of candidates) {
    try {
      const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
      const subject = checkOutInstructionsSubject();
      const body = checkOutInstructionsText({ firstName, deposit });

      await getEmailProvider().send({ to: booking.guest.email, subject, text: body, replyTo: guestReplyTo(booking.id) });
      await db.emailLog.create({ data: { bookingId: booking.id, type: "CHECK_OUT_INSTRUCTIONS", to: booking.guest.email, subject, body } });
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/**
 * Asks guests for a Google review a couple of days after checkout — enough
 * time to settle back in, while the stay is still fresh. Only for bookings
 * that actually reached checkout (never sent to cancelled/rejected ones).
 */
export async function sendReviewRequests(): Promise<TaskSummary> {
  const target = addDays(startOfUtcDay(new Date()), -REVIEW_REQUEST_AFTER_CHECKOUT_DAYS);
  const dayAfter = addDays(target, 1);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: {
      status: { in: ["APPROVED", "CHECKED_IN", "CHECKED_OUT", "CLOSED"] },
      checkOut: { gte: target, lt: dayAfter },
      emails: { none: { type: "REVIEW_REQUEST" } },
    },
    include: { guest: true },
  });

  if (candidates.length === 0) return summary;

  for (const booking of candidates) {
    try {
      const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
      const subject = reviewRequestEmailSubject();
      const body = reviewRequestEmailText({ firstName });

      await getEmailProvider().send({ to: booking.guest.email, subject, text: body, replyTo: guestReplyTo(booking.id) });
      await db.emailLog.create({ data: { bookingId: booking.id, type: "REVIEW_REQUEST", to: booking.guest.email, subject, body } });
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/** Auto-rejects bookings the host never decided on, before the 7-day Stripe auth expiry. */
export async function autoCancelStalePending(): Promise<TaskSummary> {
  const cutoff = addDays(new Date(), -AUTO_CANCEL_AFTER_PENDING_DAYS);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: { status: "PENDING_APPROVAL", createdAt: { lte: cutoff } },
    include: { guest: true },
  });

  for (const booking of candidates) {
    try {
      if (booking.stripePaymentIntentId) {
        await getPaymentProvider().releaseStayPayment(booking.stripePaymentIntentId);
      }
      await db.booking.update({ where: { id: booking.id }, data: { status: "REJECTED" } });
      await logEvent(booking.id, "BOOKING_REJECTED", `Auto-rejected — no host decision within ${AUTO_CANCEL_AFTER_PENDING_DAYS} days.`);

      const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
      const subject = rejectionEmailSubject();
      const body = rejectionEmailText({
        firstName,
        checkInDate: formatDisplayDate(booking.checkIn),
        checkOutDate: formatDisplayDate(booking.checkOut),
      });
      await getEmailProvider().send({ to: booking.guest.email, subject, text: body, replyTo: guestReplyTo(booking.id) });
      await db.emailLog.upsert({
        where: { bookingId_type: { bookingId: booking.id, type: "REJECTED" } },
        create: { bookingId: booking.id, type: "REJECTED", to: booking.guest.email, subject, body },
        update: { subject, body, sentAt: new Date() },
      });

      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/** GDPR minimisation: clears the extracted ID summary once a guest has no recent/future bookings. */
export async function purgeOldGuestIdData(): Promise<TaskSummary> {
  const cutoff = addDays(startOfUtcDay(new Date()), -GDPR_PURGE_AFTER_CHECKOUT_DAYS);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const guests = await db.guest.findMany({
    where: { idSummary: { not: null }, bookings: { every: { checkOut: { lte: cutoff } } } },
    include: { bookings: { select: { id: true } } },
  });

  for (const guest of guests) {
    if (guest.bookings.length === 0) continue;
    try {
      await db.guest.update({ where: { id: guest.id }, data: { idSummary: null } });
      await logEvent(guest.bookings[0].id, "GDPR_ID_DATA_PURGED", `Guest ${guest.id} ID summary purged ${GDPR_PURGE_AFTER_CHECKOUT_DAYS}+ days after last checkout.`);
      summary.processed++;
    } catch (err) {
      summary.errors.push(`guest ${guest.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}
