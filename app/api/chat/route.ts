import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimited } from "@/lib/rate-limit";
import { crossOrigin } from "@/lib/security";
import { getChatAssistant, type ChatMessage } from "@/lib/chat/assistant";

/**
 * Guest-assistant chat endpoint — takes the full conversation so far (not
 * just the latest message), since the assistant now handles the whole
 * conversation itself (availability, pricing, lead handoff, FAQ) via tools
 * instead of a separate scripted flow. Guardrails: same-origin only, per-IP
 * rate limit, body size cap, per-message and history-length caps,
 * control-character stripping. The behavioral guardrails (no invented
 * prices, no private-data leaks, no prompt injection, no off-topic answers)
 * live in the system prompt in lib/chat/assistant.ts.
 */

const MAX_BODY_BYTES = 8 * 1024;
const MAX_MESSAGE_CHARS = 500;
const MAX_HISTORY_MESSAGES = 30;

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

  const rawHistory = Array.isArray(body.history) ? body.history : null;
  if (!rawHistory || rawHistory.length === 0 || rawHistory.length > MAX_HISTORY_MESSAGES) {
    return NextResponse.json({ error: "Invalid conversation history." }, { status: 422 });
  }

  const history: ChatMessage[] = [];
  for (const entry of rawHistory) {
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "Invalid conversation history." }, { status: 422 });
    }
    const role = (entry as Record<string, unknown>).role;
    if (role !== "user" && role !== "assistant") {
      return NextResponse.json({ error: "Invalid conversation history." }, { status: 422 });
    }
    const content = clean((entry as Record<string, unknown>).content, MAX_MESSAGE_CHARS);
    if (!content) {
      return NextResponse.json({ error: "Invalid conversation history." }, { status: 422 });
    }
    history.push({ role, content });
  }
  if (history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Conversation must end with a guest message." }, { status: 422 });
  }

  const answer = await getChatAssistant().converse(history);
  return NextResponse.json({ answer });
}
