// Email provider seam (see PLAN.md "Mock mode"), same pattern as
// lib/stripe/payments.ts. Mock mode runs when RESEND_API_KEY is empty —
// callers should still write an EmailLog row themselves either way; this
// module only covers actually dispatching the message.

import "server-only";
import { Resend } from "resend";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(input: SendEmailInput): Promise<void>;
}

class MockEmail implements EmailProvider {
  readonly name = "mock";

  async send(input: SendEmailInput): Promise<void> {
    console.log(`[mock email] to=${input.to} subject="${input.subject}"${input.replyTo ? ` replyTo=${input.replyTo}` : ""}`);
  }
}

class ResendEmail implements EmailProvider {
  readonly name = "resend";
  private client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(input: SendEmailInput): Promise<void> {
    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error("EMAIL_FROM is not set");

    const { error } = await this.client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (error) throw new Error(`Resend send failed: ${error.message}`);
  }
}

export function getEmailProvider(): EmailProvider {
  const key = process.env.RESEND_API_KEY;
  return key ? new ResendEmail(key) : new MockEmail();
}

/**
 * Builds the guest-facing Reply-To address that routes a reply back to this
 * booking's thread (see app/api/webhooks/resend-inbound). Returns undefined
 * if inbound receiving isn't configured (INBOUND_EMAIL_DOMAIN unset), so
 * emails just fall back to the normal `from` address with no threading.
 */
export function guestReplyTo(bookingId: string): string | undefined {
  const domain = process.env.INBOUND_EMAIL_DOMAIN;
  return domain ? `reply+${bookingId}@${domain}` : undefined;
}
