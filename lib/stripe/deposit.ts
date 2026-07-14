// Damage-deposit provider seam, same pattern as lib/stripe/payments.ts. The
// £200 deposit is a SEPARATE off-session PaymentIntent from the stay total —
// placed on the card saved at booking time (booking.stripeSetupIntentId),
// held (manual capture, uncaptured), then either released (cancelled) or
// partially/fully captured if the host records damage after checkout.

import crypto from "crypto";
import { getStripe } from "./client";

export type DepositHoldResult =
  | { status: "held"; depositIntentId: string }
  | { status: "requires_action"; depositIntentId: string }
  | { status: "declined"; error: string };

export interface DepositProvider {
  readonly name: string;
  placeDepositHold(input: {
    customerId: string;
    setupIntentId: string;
    amountPence: number;
    bookingReference: string;
  }): Promise<DepositHoldResult>;
  /** Host released the hold with no damage — cancels the authorization. */
  releaseDepositHold(depositIntentId: string): Promise<void>;
  /** Host is charging (part of) the held deposit for damage. */
  chargeDeposit(depositIntentId: string, amountPence: number): Promise<{ chargeId: string }>;
}

function mockId(prefix: string): string {
  return `mock_${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

class MockDeposit implements DepositProvider {
  readonly name = "mock";

  async placeDepositHold(): Promise<DepositHoldResult> {
    return { status: "held", depositIntentId: mockId("depi") };
  }

  async releaseDepositHold(): Promise<void> {
    // Mock: nothing to call out to.
  }

  async chargeDeposit(): Promise<{ chargeId: string }> {
    return { chargeId: mockId("ch") };
  }
}

class StripeDeposit implements DepositProvider {
  readonly name = "stripe";

  async placeDepositHold(input: {
    customerId: string;
    setupIntentId: string;
    amountPence: number;
    bookingReference: string;
  }): Promise<DepositHoldResult> {
    const stripe = getStripe();
    let paymentMethodId: string | undefined;
    try {
      const setupIntent = await stripe.setupIntents.retrieve(input.setupIntentId);
      paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not look up the saved card.";
      return { status: "declined", error: message };
    }
    if (!paymentMethodId) {
      return { status: "declined", error: "No saved payment method found on the booking." };
    }

    try {
      const intent = await stripe.paymentIntents.create({
        amount: input.amountPence,
        currency: "gbp",
        customer: input.customerId,
        payment_method: paymentMethodId,
        payment_method_types: ["card"],
        capture_method: "manual",
        confirm: true,
        off_session: true,
        metadata: { bookingReference: input.bookingReference, purpose: "damage_deposit" },
      });
      if (intent.status === "requires_capture") {
        return { status: "held", depositIntentId: intent.id };
      }
      if (intent.status === "requires_action") {
        return { status: "requires_action", depositIntentId: intent.id };
      }
      return { status: "declined", error: `Unexpected deposit hold status: ${intent.status}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Card was declined";
      return { status: "declined", error: message };
    }
  }

  async releaseDepositHold(depositIntentId: string): Promise<void> {
    await getStripe().paymentIntents.cancel(depositIntentId);
  }

  async chargeDeposit(depositIntentId: string, amountPence: number): Promise<{ chargeId: string }> {
    const intent = await getStripe().paymentIntents.capture(depositIntentId, {
      amount_to_capture: amountPence,
    });
    const chargeId =
      typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
    if (!chargeId) throw new Error("Stripe did not return a charge ID for the deposit capture.");
    return { chargeId };
  }
}

export function getDepositProvider(): DepositProvider {
  return process.env.STRIPE_SECRET_KEY ? new StripeDeposit() : new MockDeposit();
}
