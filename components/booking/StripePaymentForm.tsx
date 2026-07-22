"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getBrowserStripe } from "@/lib/stripe/browserClient";

function InnerForm({
  onConfirmed,
  busyLabel,
  submitLabel,
  parentBusy,
}: {
  onConfirmed: (paymentMethodId: string) => void;
  busyLabel: string;
  submitLabel: string;
  parentBusy: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  // Only covers the Stripe.js confirm step — once that hands off to onConfirmed,
  // parentBusy takes over, so a failure downstream (e.g. booking conflict) resets
  // the button instead of leaving it stuck on the busy label forever.
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const busy = confirming || parentBusy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setConfirming(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Please check your card details.");
      setConfirming(false);
      return;
    }

    // Some banks' 3D Secure challenge pages break out of Stripe's in-page
    // modal and do a real top-level redirect. Passing return_url means the
    // bank sends the guest straight back here (with setup_intent params in
    // the query string) instead of stranding them with no way back.
    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}`,
      },
      redirect: "if_required",
    });

    if (confirmError || !setupIntent) {
      setError(confirmError?.message || "Could not save your card. Please try again.");
      setConfirming(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
    if (!paymentMethodId) {
      setError("Could not save your card. Please try again.");
      setConfirming(false);
      return;
    }

    setConfirming(false);
    onConfirmed(paymentMethodId);
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement />
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="btn-fancy mt-6 px-6 py-3 disabled:opacity-40"
      >
        {busy ? busyLabel : submitLabel}
      </button>
    </form>
  );
}

export default function StripePaymentForm(props: {
  clientSecret: string;
  onConfirmed: (paymentMethodId: string) => void;
  busyLabel: string;
  submitLabel: string;
  /** Parent's busy state for whatever happens after onConfirmed (e.g. authorizing payment, saving the booking) — keeps the button in sync instead of it staying stuck on the busy label if that later step fails. */
  busy?: boolean;
}) {
  return (
    <Elements
      stripe={getBrowserStripe()}
      options={{ clientSecret: props.clientSecret, appearance: { theme: "stripe" } }}
    >
      <InnerForm
        onConfirmed={props.onConfirmed}
        busyLabel={props.busyLabel}
        submitLabel={props.submitLabel}
        parentBusy={props.busy ?? false}
      />
    </Elements>
  );
}
