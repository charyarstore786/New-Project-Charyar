import { NextRequest, NextResponse } from "next/server";
import { createVerificationSession } from "@/lib/stripe/identity";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";

const EMAIL_RE = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;

export async function POST(req: NextRequest) {
  if (crossOrigin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (rateLimited("stripe-identity-session", clientIp(req), { max: 20, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const customerId = typeof body.customerId === "string" ? body.customerId : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 160) : "";
  if (!customerId) return NextResponse.json({ error: "Missing customer." }, { status: 422 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "A valid email is required." }, { status: 422 });

  try {
    const session = await createVerificationSession({ customerId, email });
    return NextResponse.json(session);
  } catch (err) {
    console.error("Failed to create Stripe Identity verification session:", err);
    return NextResponse.json({ error: "Could not start ID verification." }, { status: 500 });
  }
}
