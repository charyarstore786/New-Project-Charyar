import { NextRequest, NextResponse } from "next/server";
import { authorizeStayPayment } from "@/lib/stripe/payments";
import { computeQuote, validateStay } from "@/lib/booking/quote";
import { isRangeAvailable } from "@/lib/booking/availability";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";

/**
 * Authorizes the stay total using the card just saved via the SetupIntent.
 * The amount is always recomputed server-side from the stay dates — never
 * trusted from the client — so a guest can't tamper with the price.
 */
export async function POST(req: NextRequest) {
  if (crossOrigin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (rateLimited("stripe-payment-intent", clientIp(req), { max: 20, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const customerId = typeof body.customerId === "string" ? body.customerId : "";
  const paymentMethodId = typeof body.paymentMethodId === "string" ? body.paymentMethodId : "";
  const bookingReference = typeof body.bookingReference === "string" ? body.bookingReference.slice(0, 40) : "pending";
  if (!customerId || !paymentMethodId) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 422 });
  }

  const validated = validateStay(body);
  if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 422 });

  const { checkIn, checkOut } = validated.stay;
  if (!(await isRangeAvailable(checkIn, checkOut))) {
    return NextResponse.json({ error: "Those dates have just been booked — please pick different dates." }, { status: 409 });
  }

  const quote = computeQuote(validated.stay);

  const result = await authorizeStayPayment({
    customerId,
    paymentMethodId,
    totalPence: quote.total,
    bookingReference,
  });

  if (result.status === "failed") {
    return NextResponse.json({ error: result.error }, { status: 402 });
  }
  return NextResponse.json(result);
}
