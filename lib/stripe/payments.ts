// Payment provider seam (see PLAN.md "Mock mode"). MockPayments runs when
// STRIPE_SECRET_KEY is empty; StripePayments is the real driver, used once a
// key is configured. The booking wizard drives the guest-facing Stripe.js
// steps (SetupIntent confirmation) directly — this module covers the
// server-side pieces: creating the Customer/SetupIntent/PaymentIntent, and
// capturing/releasing the authorization once the host decides.

import crypto from "crypto";
import { getStripe } from "./client";

export type BookingPaymentSetup = {
  /** Stripe Customer holding the saved card */
  customerId: string;
  /** Manual-capture PaymentIntent for the stay total (authorized, not captured) */
  paymentIntentId: string;
  /** SetupIntent that saved the card for the later deposit hold */
  setupIntentId: string;
};

export interface PaymentProvider {
  readonly name: string;
  /** Host approved — capture the previously-authorized stay total. */
  captureStayPayment(paymentIntentId: string): Promise<void>;
  /** Host rejected — release the authorization, guest is never charged. */
  releaseStayPayment(paymentIntentId: string): Promise<void>;
}

class MockPayments implements PaymentProvider {
  readonly name = "mock";

  async captureStayPayment(): Promise<void> {
    // Mock: nothing to call out to.
  }

  async releaseStayPayment(): Promise<void> {
    // Mock: nothing to call out to.
  }
}

class StripePayments implements PaymentProvider {
  readonly name = "stripe";

  async captureStayPayment(paymentIntentId: string): Promise<void> {
    await getStripe().paymentIntents.capture(paymentIntentId);
  }

  async releaseStayPayment(paymentIntentId: string): Promise<void> {
    await getStripe().paymentIntents.cancel(paymentIntentId);
  }
}

export function getPaymentProvider(): PaymentProvider {
  return process.env.STRIPE_SECRET_KEY ? new StripePayments() : new MockPayments();
}

/** Mock customer id generator, shared with the /api/stripe routes below. */
function mockId(prefix: string): string {
  return `mock_${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

export async function createCustomer(input: { name: string; email: string }): Promise<string> {
  if (!process.env.STRIPE_SECRET_KEY) return mockId("cus");
  const customer = await getStripe().customers.create({ name: input.name, email: input.email });
  return customer.id;
}

/** SetupIntent so the guest's card can be saved (confirmed client-side via Stripe.js). */
export async function createSetupIntent(customerId: string): Promise<{ clientSecret: string; setupIntentId: string }> {
  if (!process.env.STRIPE_SECRET_KEY) {
    const id = mockId("seti");
    return { clientSecret: `${id}_secret_${crypto.randomBytes(4).toString("hex")}`, setupIntentId: id };
  }
  const setupIntent = await getStripe().setupIntents.create({
    customer: customerId,
    usage: "off_session",
    // Card only — no redirect-based methods, so no return_url is needed and
    // the deposit hold/capture flow (which relies on a saved card) stays simple.
    payment_method_types: ["card"],
  });
  if (!setupIntent.client_secret) throw new Error("Stripe did not return a SetupIntent client secret");
  return { clientSecret: setupIntent.client_secret, setupIntentId: setupIntent.id };
}

export type StayPaymentResult =
  | { status: "authorized"; paymentIntentId: string }
  | { status: "requires_action"; paymentIntentId: string; clientSecret: string }
  | { status: "failed"; error: string };

/**
 * Manual-capture PaymentIntent for the stay total, confirmed immediately
 * using the card just saved via the SetupIntent. Capture happens later, only
 * when the host approves (see captureStayPayment above).
 */
export async function authorizeStayPayment(input: {
  customerId: string;
  paymentMethodId: string;
  totalPence: number;
  bookingReference: string;
}): Promise<StayPaymentResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { status: "authorized", paymentIntentId: mockId("pi") };
  }
  try {
    const intent = await getStripe().paymentIntents.create({
      amount: input.totalPence,
      currency: "gbp",
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      payment_method_types: ["card"],
      capture_method: "manual",
      confirm: true,
      off_session: false,
      metadata: { bookingReference: input.bookingReference },
    });
    if (intent.status === "requires_action" && intent.client_secret) {
      return { status: "requires_action", paymentIntentId: intent.id, clientSecret: intent.client_secret };
    }
    if (intent.status === "requires_capture") {
      return { status: "authorized", paymentIntentId: intent.id };
    }
    return { status: "failed", error: `Unexpected payment status: ${intent.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Card was declined";
    return { status: "failed", error: message };
  }
}
