import { NextRequest, NextResponse } from "next/server";
import { createCustomer } from "@/lib/stripe/payments";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;

/** First step of the wizard's payment/ID flow: a Stripe Customer to attach the SetupIntent and VerificationSession to. */
export async function POST(req: NextRequest) {
  if (crossOrigin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (rateLimited("stripe-customer", clientIp(req), { max: 20, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";
  if (!name || name.length < 2) return NextResponse.json({ error: "A valid name is required." }, { status: 422 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 422 });

  try {
    const customerId = await createCustomer({ name, email });
    return NextResponse.json({ customerId });
  } catch (err) {
    console.error("Failed to create Stripe customer:", err);
    return NextResponse.json({ error: "Could not start payment setup." }, { status: 500 });
  }
}
