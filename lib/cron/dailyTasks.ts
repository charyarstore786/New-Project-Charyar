// Daily automation tasks (see PLAN.md "Automations"). Run once a day from
// app/api/cron/daily/route.ts. Each function is independently idempotent —
// safe to re-run the same day without double-sending emails or double-
// charging cards — so a retried or overlapping cron invocation is harmless.

import "server-only";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { getDepositProvider } from "@/lib/stripe/deposit";
import { getPaymentProvider } from "@/lib/stripe/payments";
import { getEmailProvider } from "@/lib/email/send";
import { deriveDepositStatus } from "@/lib/booking/depositStatus";
import { checkInInstructionsSubject, checkInInstructionsText } from "@/lib/email/templates/checkInInstructions";
import { checkOutInstructionsSubject, checkOutInstructionsText } from "@/lib/email/templates/checkOutInstructions";

const AUTO_RELEASE_AFTER_CHECKOUT_DAYS = 6;
const AUTO_CANCEL_AFTER_PENDING_DAYS = 6;
const GDPR_PURGE_AFTER_CHECKOUT_DAYS = 30;

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

/** Places the £200 deposit hold for bookings checking in today. */
export async function placeDepositsForCheckIns(): Promise<TaskSummary> {
  const today = startOfUtcDay(new Date());
  const tomorrow = addDays(today, 1);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: { status: { in: ["APPROVED", "CHECKED_IN"] }, checkIn: { gte: today, lt: tomorrow } },
  });

  for (const booking of candidates) {
    try {
      const events = await db.eventLog.findMany({ where: { bookingId: booking.id } });
      if (deriveDepositStatus(events) !== "NONE") continue;
      if (!booking.stripeCustomerId || !booking.stripeSetupIntentId) {
        await logEvent(booking.id, "DEPOSIT_HOLD_DECLINED", "No saved card on this booking.");
        continue;
      }

      const result = await getDepositProvider().placeDepositHold({
        customerId: booking.stripeCustomerId,
        setupIntentId: booking.stripeSetupIntentId,
        amountPence: site.deposit * 100,
        bookingReference: booking.reference,
      });

      if (result.status === "held" || result.status === "requires_action") {
        await db.booking.update({ where: { id: booking.id }, data: { stripeDepositIntentId: result.depositIntentId } });
        await logEvent(booking.id, "DEPOSIT_HELD", `£${site.deposit} hold placed (intent ${result.depositIntentId}) via cron.`);
      } else {
        await logEvent(booking.id, "DEPOSIT_HOLD_DECLINED", `${result.error} (cron attempt — host should retry manually).`);
      }
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/** Auto-releases deposit holds ~6 days after checkout if the host took no action. */
export async function autoReleaseDeposits(): Promise<TaskSummary> {
  const cutoff = addDays(startOfUtcDay(new Date()), -AUTO_RELEASE_AFTER_CHECKOUT_DAYS);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: { checkOut: { lte: cutoff }, stripeDepositIntentId: { not: null } },
  });

  for (const booking of candidates) {
    try {
      const events = await db.eventLog.findMany({ where: { bookingId: booking.id } });
      if (deriveDepositStatus(events) !== "HELD") continue;

      await getDepositProvider().releaseDepositHold(booking.stripeDepositIntentId!);
      await logEvent(booking.id, "DEPOSIT_RELEASED", `Hold ${booking.stripeDepositIntentId} auto-released ${AUTO_RELEASE_AFTER_CHECKOUT_DAYS} days after checkout.`);
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/** Sends check-in instructions the day before arrival. */
export async function sendCheckInInstructions(): Promise<TaskSummary> {
  const tomorrow = addDays(startOfUtcDay(new Date()), 1);
  const dayAfter = addDays(tomorrow, 1);
  const summary: TaskSummary = { processed: 0, errors: [] };

  const candidates = await db.booking.findMany({
    where: {
      status: { in: ["APPROVED", "CHECKED_IN"] },
      checkIn: { gte: tomorrow, lt: dayAfter },
      emails: { none: { type: "CHECK_IN_INSTRUCTIONS" } },
    },
    include: { guest: true },
  });

  for (const booking of candidates) {
    try {
      const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
      const subject = checkInInstructionsSubject();
      const body = checkInInstructionsText({ firstName, checkInDate: formatDisplayDate(booking.checkIn) });

      await getEmailProvider().send({ to: booking.guest.email, subject, text: body });
      await db.emailLog.create({ data: { bookingId: booking.id, type: "CHECK_IN_INSTRUCTIONS", to: booking.guest.email, subject, body } });
      summary.processed++;
    } catch (err) {
      summary.errors.push(`${booking.reference}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return summary;
}

/** Sends check-out instructions on checkout morning. */
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

  for (const booking of candidates) {
    try {
      const firstName = booking.guest.name.split(" ")[0] || booking.guest.name;
      const subject = checkOutInstructionsSubject();
      const body = checkOutInstructionsText({ firstName });

      await getEmailProvider().send({ to: booking.guest.email, subject, text: body });
      await db.emailLog.create({ data: { bookingId: booking.id, type: "CHECK_OUT_INSTRUCTIONS", to: booking.guest.email, subject, body } });
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
  });

  for (const booking of candidates) {
    try {
      if (booking.stripePaymentIntentId) {
        await getPaymentProvider().releaseStayPayment(booking.stripePaymentIntentId);
      }
      await db.booking.update({ where: { id: booking.id }, data: { status: "REJECTED" } });
      await logEvent(booking.id, "BOOKING_REJECTED", `Auto-rejected — no host decision within ${AUTO_CANCEL_AFTER_PENDING_DAYS} days.`);
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
