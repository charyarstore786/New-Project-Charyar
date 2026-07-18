import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/email/send";
import { site } from "@/lib/site";

/**
 * Resend inbound-email webhook. Guest replies land on
 * reply+{bookingId}@INBOUND_EMAIL_DOMAIN (see lib/email/send.ts
 * guestReplyTo) — this looks up that booking, stores the reply as an IN
 * Message (see app/admin/(dashboard)/bookings/[id]/actions.ts
 * sendGuestMessage for the OUT side), and pings the host by email since
 * they won't be watching the dashboard live.
 *
 * Signature-verified server-to-server call from Resend, so — like the
 * Stripe webhook — this skips the crossOrigin/rate-limit checks the rest
 * of the API uses.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!apiKey || !webhookSecret) {
    console.error("Resend inbound webhook received but RESEND_API_KEY/RESEND_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Inbound not configured." }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers." }, { status: 400 });
  }

  const rawBody = await req.text();
  const resend = new Resend(apiKey);

  let event;
  try {
    event = resend.webhooks.verify({
      payload: rawBody,
      headers: { id: svixId, timestamp: svixTimestamp, signature: svixSignature },
      webhookSecret,
    });
  } catch (err) {
    console.error("Resend inbound webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ received: true });
  }

  const { data: full, error } = await resend.emails.receiving.get(event.data.email_id);
  if (error || !full) {
    console.error("Could not fetch inbound email content:", error);
    return NextResponse.json({ error: "Could not fetch email content." }, { status: 500 });
  }

  const recipient = full.to.find((addr) => addr.startsWith("reply+")) ?? full.to[0];
  const bookingId = recipient?.match(/^reply\+([^@]+)@/)?.[1];
  if (!bookingId) {
    console.error("Inbound email recipient didn't match reply+<bookingId>@ pattern:", full.to);
    return NextResponse.json({ received: true });
  }

  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { guest: true } });
  if (!booking) {
    console.error("Inbound email matched no booking:", bookingId);
    return NextResponse.json({ received: true });
  }

  const body = (full.text?.trim() || (full.html ? stripHtml(full.html) : "")).trim();
  if (!body) return NextResponse.json({ received: true });

  await db.message.create({ data: { bookingId: booking.id, direction: "IN", body } });

  try {
    await getEmailProvider().send({
      to: site.email,
      subject: `New message from ${booking.guest.name} — ${booking.reference}`,
      text: `${booking.guest.name} replied on booking ${booking.reference}:\n\n${body}\n\nReply from the admin dashboard: ${site.url.replace(/\/$/, "")}/admin/bookings/${booking.id}`,
    });
  } catch (err) {
    console.error("Host new-message notification failed:", err);
  }

  return NextResponse.json({ received: true });
}
