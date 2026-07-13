import { NextRequest, NextResponse } from "next/server";
import { getVerificationStatus } from "@/lib/stripe/identity";
import { clientIp, rateLimited } from "@/lib/rate-limit";

/** Polled by the wizard right after the guest closes the Stripe Identity modal. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (rateLimited("stripe-identity-status", clientIp(req), { max: 60, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing session id." }, { status: 400 });

  try {
    const status = await getVerificationStatus(id);
    return NextResponse.json({ status });
  } catch (err) {
    console.error("Failed to check Stripe Identity status:", err);
    return NextResponse.json({ error: "Could not check verification status." }, { status: 500 });
  }
}
