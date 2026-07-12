// ID-verification seam. Mock verifier runs when STRIPE_SECRET_KEY is empty;
// Stripe Identity (verification sessions) slots in behind the same interface.
// Document images never touch our servers — only the status and a minimal
// extracted summary are stored.

import crypto from "crypto";

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

export function getIdentityProvider(): IdentityProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    throw new Error("Real Stripe Identity driver not implemented yet — clear STRIPE_SECRET_KEY to use mock mode.");
  }
  return new MockIdentity();
}
