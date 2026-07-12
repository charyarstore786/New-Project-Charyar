import { NextRequest, NextResponse } from "next/server";
import { promises as fsp } from "fs";
import path from "path";
import crypto from "crypto";
import { crossOrigin } from "@/lib/security";

/**
 * Lead capture endpoint for the site chat widget.
 * Guardrails: body size cap, per-IP rate limit, strict validation,
 * control-character stripping, serialized atomic writes to leads.json.
 */

const LEADS_FILE = path.join(process.cwd(), "leads.json");
const MAX_BODY_BYTES = 10 * 1024;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
// Keep only the newest leads so the file can't grow without bound
const MAX_STORED_LEADS = 2000;

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,63}(\.[^\s@]{2,24})+$/;

/** Strip control characters (below 32, plus DEL) and collapse whitespace. */
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

const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (list.length >= RATE_LIMIT_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

let writeChain: Promise<void> = Promise.resolve();

function appendLead(lead: object): Promise<void> {
  writeChain = writeChain.then(async () => {
    let leads: unknown[] = [];
    try {
      const raw = await fsp.readFile(LEADS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      leads = Array.isArray(parsed) ? parsed : [];
    } catch {
      leads = [];
    }
    leads.push(lead);
    if (leads.length > MAX_STORED_LEADS) leads = leads.slice(-MAX_STORED_LEADS);
    const tmp = `${LEADS_FILE}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(leads, null, 2), "utf8");
    await fsp.rename(tmp, LEADS_FILE);
  });
  return writeChain;
}

export async function POST(req: NextRequest) {
  if (crossOrigin(req)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — try again later." },
      { status: 429 },
    );
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

  // Honeypot: the widget always sends an empty `company`; bots that fill it
  // get a convincing fake success and nothing is stored.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true, id: crypto.randomUUID() }, { status: 201 });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const stayDates = clean(body.stayDates, 120);

  if (!name)
    return NextResponse.json(
      { error: "A valid name is required." },
      { status: 422 },
    );
  if (!email || !EMAIL_RE.test(email))
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 422 },
    );
  if (!stayDates)
    return NextResponse.json(
      { error: "Requested dates are required." },
      { status: 422 },
    );

  const lead = {
    id: crypto.randomUUID(),
    name,
    email,
    stayDates,
    source: "site-chat",
    createdAt: new Date().toISOString(),
  };

  try {
    await appendLead(lead);
  } catch (err) {
    console.error("Failed to save lead:", err);
    return NextResponse.json(
      { error: "Could not save your details." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}
