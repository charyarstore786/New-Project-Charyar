import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { db } from "@/lib/db";

/**
 * Stripe webhook receiver. Signature-verified, so this is the one endpoint
 * that trusts its payload without the crossOrigin/rate-limit checks the rest
 * of the API uses (Stripe calls it server-to-server, no browser involved).
 *
 * The booking wizard already confirms ID verification and payment
 * synchronously (polling + Stripe.js), so this mostly exists as an audit
 * trail and a safety net for anything that resolves after the guest has
 * moved on (e.g. a slow Identity check, an async payment failure).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });

  const rawBody = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input": {
        const session = event.data.object as { id: string; last_error?: { reason?: string } | null };
        await db.eventLog.create({
          data: {
            type: `STRIPE_${event.type.toUpperCase()}`,
            detail: `Identity session ${session.id}${session.last_error?.reason ? ` — ${session.last_error.reason}` : ""}`,
          },
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as { id: string; last_payment_error?: { message?: string } | null };
        const booking = await db.booking.findFirst({ where: { stripePaymentIntentId: intent.id } });
        await db.eventLog.create({
          data: {
            bookingId: booking?.id,
            type: "STRIPE_PAYMENT_FAILED",
            detail: `PaymentIntent ${intent.id}${intent.last_payment_error?.message ? ` — ${intent.last_payment_error.message}` : ""}`,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    // Log and still 200 — retrying won't fix a bug in our own handler, and
    // Stripe will keep retrying non-2xx responses indefinitely otherwise.
    console.error(`Error handling Stripe webhook ${event.type}:`, err);
  }

  return NextResponse.json({ received: true });
}
