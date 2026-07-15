import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/booking/create";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";

const MAX_BODY_BYTES = 10 * 1024;
const EMAIL_RE = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;

/** Strip control characters and collapse whitespace. */
function clean(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const out = Array.from(value)
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c >= 32 && c !== 127;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (out.length === 0 || out.length > maxLen) return null;
  return out;
}

export async function POST(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (rateLimited("bookings", clientIp(req), { max: 5, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const guest = (body.guest ?? {}) as Record<string, unknown>;
  const name = clean(guest.name, 80);
  const email = clean(guest.email, 120);
  const phone = clean(guest.phone, 20);
  const country = clean(guest.country, 56) ?? undefined;
  const address = clean(guest.address, 200);

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 422 });
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 422 });
  }
  if (!phone || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 422 });
  }
  if (!address || address.length < 5) {
    return NextResponse.json({ error: "Please enter your home address." }, { status: 422 });
  }

  const stripe = (body.stripe ?? {}) as Record<string, unknown>;
  const customerId = clean(stripe.customerId, 120);
  const setupIntentId = clean(stripe.setupIntentId, 120);
  const paymentIntentId = clean(stripe.paymentIntentId, 120);
  const verificationSessionId = clean(stripe.verificationSessionId, 120);
  if (!customerId || !setupIntentId || !paymentIntentId || !verificationSessionId) {
    return NextResponse.json({ error: "Missing payment/verification details." }, { status: 422 });
  }

  const result = await createBooking({
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    guests: body.guests,
    guest: { name, email, phone, country, address },
    stripe: { customerId, setupIntentId, paymentIntentId, verificationSessionId },
  });

  if (!result.ok) {
    const status =
      result.code === "INVALID" ? 422 : result.code === "UNAVAILABLE" ? 409 : 502;
    return NextResponse.json({ error: result.error, code: result.code }, { status });
  }

  return NextResponse.json(
    { ok: true, reference: result.reference, status: result.status },
    { status: 201 },
  );
}
