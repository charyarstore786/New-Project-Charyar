import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";
import { getChatAssistant } from "@/lib/chat/assistant";

/**
 * Guest-assistant chat endpoint. Guardrails: same-origin only, per-IP rate
 * limit, body size cap, question length cap, control-character stripping.
 * The actual behavioral guardrails (no invented prices, no private-data
 * leaks, no prompt injection, no off-topic answers) live in the system
 * prompt in lib/chat/assistant.ts.
 */

const MAX_BODY_BYTES = 2 * 1024;
const MAX_QUESTION_CHARS = 500;

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
  if (rateLimited("chat", clientIp(req), { max: 20, windowMs: 10 * 60 * 1000 })) {
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

  const question = clean(body.question, MAX_QUESTION_CHARS);
  if (!question) {
    return NextResponse.json({ error: "Please ask a question." }, { status: 422 });
  }

  const answer = await getChatAssistant().answer(question);
  return NextResponse.json({ answer });
}
