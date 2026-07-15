"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isRangeAvailable, syncExternalBlocks } from "@/lib/booking/availability";
import { computeQuote, validateStay } from "@/lib/booking/quote";
import { newReference } from "@/lib/booking/create";
import { sendConfirmationEmail } from "../[id]/actions";

const EMAIL_RE = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

export type ManualBookingInput = {
  checkIn: string;
  checkOut: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  country?: string;
  note?: string;
  sendEmail: boolean;
};

export type ManualBookingResult = { ok: true; bookingId: string } | { ok: false; error: string };

/**
 * Admin-entered booking for phone/walk-in guests — skips the online
 * ID-verification and card-authorization steps entirely and lands straight
 * in APPROVED (the host is vouching for the guest), which blocks the dates
 * immediately just like an online booking would.
 */
export async function createManualBooking(input: ManualBookingInput): Promise<ManualBookingResult> {
  const validated = await validateStay(input);
  if (!validated.ok) return { ok: false, error: validated.error };
  const stay = validated.stay;

  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().slice(0, 120);
  const phone = input.phone.trim().slice(0, 30);
  if (name.length < 2) return { ok: false, error: "Please enter the guest's full name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!PHONE_RE.test(phone)) return { ok: false, error: "Please enter a valid phone number." };

  await syncExternalBlocks();
  if (!(await isRangeAvailable(stay.checkIn, stay.checkOut))) {
    return { ok: false, error: "Those dates are already booked or blocked." };
  }

  const quote = await computeQuote(stay);
  const reference = newReference();

  const booking = await db.$transaction(async (tx) => {
    if (!(await isRangeAvailable(stay.checkIn, stay.checkOut, tx))) return null;

    const guest = await tx.guest.create({
      data: {
        name,
        email,
        phone,
        country: input.country?.trim().slice(0, 60) || null,
        verificationStatus: "UNVERIFIED",
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
        status: "APPROVED",
        guestId: guest.id,
        notes: input.note?.trim().slice(0, 500) || "Added manually by host.",
      },
    });

    await tx.eventLog.create({
      data: {
        bookingId: created.id,
        type: "BOOKING_CREATED",
        detail: `Manual booking added by host: ${quote.checkIn} → ${quote.checkOut}, ${stay.guests} guest(s), total ${quote.total}p. No online payment or ID check.`,
      },
    });

    return created;
  });

  if (!booking) return { ok: false, error: "Those dates were just booked — please pick different dates." };

  if (input.sendEmail) {
    await sendConfirmationEmail(booking.id);
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/");
  revalidatePath("/book");

  return { ok: true, bookingId: booking.id };
}
