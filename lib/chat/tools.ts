import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { isRangeAvailable, syncExternalBlocks } from "@/lib/booking/availability";
import { computeQuote, validateStay } from "@/lib/booking/quote";
import { formatGbp } from "@/lib/booking/format";
import { getEmailProvider } from "@/lib/email/send";
import { site } from "@/lib/site";

/**
 * Real tools the chat assistant can call (see lib/chat/assistant.ts for the
 * agentic loop that executes them). Both hit the same backend the rest of
 * the site uses — the model never invents availability, pricing, or a
 * "saved" enquiry, it calls these and reports what actually happened.
 */
export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "check_availability_and_price",
    description:
      "Check real-time availability and the exact price for a specific check-in/check-out date range. Always call this before telling a guest whether dates are free or what they'd cost — never guess or estimate.",
    input_schema: {
      type: "object",
      properties: {
        checkIn: { type: "string", description: "Check-in date as YYYY-MM-DD" },
        checkOut: { type: "string", description: "Check-out date (exclusive) as YYYY-MM-DD" },
        guests: { type: "integer", description: "Number of guests. Defaults to 2 if the guest hasn't said." },
      },
      required: ["checkIn", "checkOut"],
    },
  },
  {
    name: "submit_lead",
    description:
      "Send the guest's contact details and enquiry straight to the host so they can follow up directly. Only call this once you have the guest's name and a valid email, and they've agreed to have their details passed along — never call it silently.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Guest's full name" },
        email: { type: "string", description: "Guest's email address" },
        phone: { type: "string", description: "Guest's phone number, if given" },
        message: {
          type: "string",
          description: "Short summary for the host: requested dates, the quote if one was checked, and/or their question",
        },
      },
      required: ["name", "email", "message"],
    },
  },
];

const EMAIL_RE = /^[^\s@]{1,64}@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,24}$/;

export async function executeCheckAvailability(input: {
  checkIn?: unknown;
  checkOut?: unknown;
  guests?: unknown;
}): Promise<object> {
  const validated = await validateStay({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests ?? 2,
  });
  if (!validated.ok) return { available: false, error: validated.error };

  await syncExternalBlocks();
  const { checkIn, checkOut } = validated.stay;
  if (!(await isRangeAvailable(checkIn, checkOut))) {
    return { available: false, error: "Those dates are already booked." };
  }

  const quote = await computeQuote(validated.stay);
  return {
    available: true,
    checkIn: quote.checkIn,
    checkOut: quote.checkOut,
    nights: quote.nights,
    guests: quote.guests,
    nightlyRate: formatGbp(quote.nightlyRate),
    total: formatGbp(quote.total),
  };
}

export async function executeSubmitLead(input: {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
}): Promise<object> {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  const email = typeof input.email === "string" ? input.email.trim().slice(0, 120) : "";
  const phone = typeof input.phone === "string" ? input.phone.trim().slice(0, 30) : "";
  const message = typeof input.message === "string" ? input.message.trim().slice(0, 500) : "";

  if (!name || name.length < 2) return { ok: false, error: "Missing or invalid name." };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: "Missing or invalid email address." };

  const lead = await db.lead.create({
    data: { name, email, phone: phone || null, message: message || null, source: "chat" },
  });

  try {
    await getEmailProvider().send({
      to: site.email,
      subject: `New chat enquiry — ${name}`,
      text: `New enquiry from the site chat widget:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\nDetails: ${message || "—"}\n\nReply directly to ${email}, or see it in /admin.`,
    });
  } catch (err) {
    console.error("Lead notification email failed:", err);
  }

  return { ok: true, leadId: lead.id };
}

export async function executeChatTool(name: string, input: Record<string, unknown>): Promise<object> {
  if (name === "check_availability_and_price") return executeCheckAvailability(input);
  if (name === "submit_lead") return executeSubmitLead(input);
  return { error: `Unknown tool: ${name}` };
}
