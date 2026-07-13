import { NextRequest, NextResponse } from "next/server";
import { createSetupIntent } from "@/lib/stripe/payments";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  if (crossOrigin(req)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (rateLimited("stripe-setup-intent", clientIp(req), { max: 20, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const customerId = typeof body.customerId === "string" ? body.customerId : "";
  if (!customerId) return NextResponse.json({ error: "Missing customer." }, { status: 422 });

  try {
    const { clientSecret, setupIntentId } = await createSetupIntent(customerId);
    return NextResponse.json({ clientSecret, setupIntentId });
  } catch (err) {
    console.error("Failed to create Stripe SetupIntent:", err);
    return NextResponse.json({ error: "Could not start card setup." }, { status: 500 });
  }
}
