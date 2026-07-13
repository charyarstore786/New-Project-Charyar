// ID-verification seam. Mock verifier runs when STRIPE_SECRET_KEY is empty;
// Stripe Identity (hosted verification sessions, opened client-side via
// Stripe.js) slots in behind the same shape. Document images never touch our
// servers — only the status and a minimal extracted summary are stored.

import crypto from "crypto";
import { getStripe } from "./client";

export type VerificationResult = {
  status: "VERIFIED" | "FAILED" | "PENDING";
  /** Minimal extracted summary for the host dashboard (JSON-serializable). */
  summary: {
    documentType: string;
    documentNumber: string;
    name: string;
    checkedAt: string;
  };
};

export interface IdentityProvider {
  readonly name: string;
  verifyGuest(input: { name: string; email: string }): Promise<VerificationResult>;
}

class MockIdentity implements IdentityProvider {
  readonly name = "mock";

  async verifyGuest(input: { name: string }): Promise<VerificationResult> {
    return {
      status: "VERIFIED",
      summary: {
        documentType: "passport (mock)",
        documentNumber: `**** ${crypto.randomInt(1000, 9999)}`,
        name: input.name,
        checkedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Real Stripe Identity check for the booking-creation step: by the time this
 * runs, the guest has already completed the hosted verification modal
 * client-side (see /api/stripe/identity-session) — this just confirms the
 * final server-side status before we take payment and create the booking.
 */
class StripeIdentity implements IdentityProvider {
  readonly name = "stripe";

  async verifyGuest(): Promise<VerificationResult> {
    throw new Error("StripeIdentity.verifyGuest() is unused — verification session id is checked directly in lib/booking/create.ts");
  }
}

export function getIdentityProvider(): IdentityProvider {
  return process.env.STRIPE_SECRET_KEY ? new StripeIdentity() : new MockIdentity();
}

function mockId(prefix: string): string {
  return `mock_${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

/** Creates the hosted verification session the guest completes via Stripe.js. */
export async function createVerificationSession(input: {
  customerId: string;
  email: string;
}): Promise<{ sessionId: string; clientSecret: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { sessionId: mockId("vs"), clientSecret: `${mockId("vs")}_secret_${crypto.randomBytes(4).toString("hex")}` };
  }
  const session = await getStripe().identity.verificationSessions.create({
    type: "document",
    provided_details: { email: input.email },
    metadata: { customerId: input.customerId },
  });
  if (!session.client_secret) throw new Error("Stripe did not return a VerificationSession client secret");
  return { sessionId: session.id, clientSecret: session.client_secret };
}

export type VerificationStatus = "processing" | "verified" | "requires_input" | "canceled";

/** Polled by the wizard right after the guest closes the verification modal. */
export async function getVerificationStatus(sessionId: string): Promise<VerificationStatus> {
  if (!process.env.STRIPE_SECRET_KEY || sessionId.startsWith("mock_")) return "verified";
  const session = await getStripe().identity.verificationSessions.retrieve(sessionId);
  return session.status as VerificationStatus;
}

/** Extracts the minimal summary stored on the Guest record — never the document images. */
export async function getVerificationSummary(
  sessionId: string,
  fallbackName: string,
): Promise<VerificationResult["summary"]> {
  if (!process.env.STRIPE_SECRET_KEY || sessionId.startsWith("mock_")) {
    return {
      documentType: "passport (mock)",
      documentNumber: `**** ${crypto.randomInt(1000, 9999)}`,
      name: fallbackName,
      checkedAt: new Date().toISOString(),
    };
  }
  const session = await getStripe().identity.verificationSessions.retrieve(sessionId, {
    expand: ["last_verification_report"],
  });
  const report = session.last_verification_report;
  const document = report && typeof report !== "string" ? report.document : undefined;
  return {
    documentType: document?.type ?? "unknown",
    documentNumber: document?.number ? `**** ${document.number.slice(-4)}` : "****",
    name: fallbackName,
    checkedAt: new Date().toISOString(),
  };
}
