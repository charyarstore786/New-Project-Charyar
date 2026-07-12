// Payment provider seam (see PLAN.md "Mock mode"). The booking engine only
// talks to this interface. MockPayments runs when STRIPE_SECRET_KEY is empty;
// the real Stripe driver (manual-capture PaymentIntent + SetupIntent on one
// Customer) slots in behind the same interface.

import crypto from "crypto";

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
  /**
   * Authorize the stay total and save the card for the deposit, in one flow.
   * Capture happens only when the host approves the booking.
   */
  setupBookingPayment(input: {
    totalPence: number;
    guestName: string;
    guestEmail: string;
    bookingReference: string;
  }): Promise<BookingPaymentSetup>;
}

class MockPayments implements PaymentProvider {
  readonly name = "mock";

  async setupBookingPayment(): Promise<BookingPaymentSetup> {
    const suffix = () => crypto.randomBytes(8).toString("hex");
    return {
      customerId: `mock_cus_${suffix()}`,
      paymentIntentId: `mock_pi_${suffix()}`,
      setupIntentId: `mock_seti_${suffix()}`,
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    throw new Error("Real Stripe driver not implemented yet — clear STRIPE_SECRET_KEY to use mock mode.");
  }
  return new MockPayments();
}
