"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/stripe/payments";
import { confirmationEmailSubject, confirmationEmailText } from "@/lib/email/templates/confirmation";

function formatDisplayDate(iso: Date): string {
  return iso.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

async function logEvent(bookingId: string, type: string, detail?: string) {
  await db.eventLog.create({ data: { bookingId, type, detail } });
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
  const booking = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  if (booking.status !== "PENDING_APPROVAL" && booking.status !== "PENDING_VERIFICATION") return;

  if (booking.stripePaymentIntentId) {
    await getPaymentProvider().releaseStayPayment(booking.stripePaymentIntentId);
  }

  await db.booking.update({
    where: { id: bookingId },
    data: { status: "REJECTED", notes: reason || booking.notes },
  });
  await logEvent(bookingId, "BOOKING_REJECTED", reason || "Rejected by host. Authorization released.");

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
  const subject = confirmationEmailSubject();
  const body = confirmationEmailText({
    firstName,
    checkInDate: formatDisplayDate(booking.checkIn),
    checkOutDate: formatDisplayDate(booking.checkOut),
  });

  // Mock mode: no Resend key configured yet — log the email instead of
  // sending it (see PLAN.md, lib/email/send.ts is not wired up yet).
  await db.emailLog.upsert({
    where: { bookingId_type: { bookingId, type: "CONFIRMATION" } },
    create: { bookingId, type: "CONFIRMATION", to: booking.guest.email, subject, body },
    update: { subject, body, sentAt: new Date() },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
}

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
