import { NextRequest, NextResponse } from "next/server";
import { isRangeAvailable, syncExternalBlocks } from "@/lib/booking/availability";
import { computeQuote, validateStay } from "@/lib/booking/quote";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";

/** Server-side quote: validates the stay, confirms availability, prices it. */
export async function POST(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (rateLimited("quote", clientIp(req), { max: 60, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many requests — try again later." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validated = await validateStay(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 422 });
  }

  await syncExternalBlocks();
  const { checkIn, checkOut } = validated.stay;
  if (!(await isRangeAvailable(checkIn, checkOut))) {
    return NextResponse.json(
      { error: "Those dates are no longer available — please pick different dates." },
      { status: 409 },
    );
  }

  return NextResponse.json({ quote: await computeQuote(validated.stay) });
}
