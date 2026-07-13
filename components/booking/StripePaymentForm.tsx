"use client";

import { useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { getBrowserStripe } from "@/lib/stripe/browserClient";

function InnerForm({
  onConfirmed,
  busyLabel,
  submitLabel,
}: {
  onConfirmed: (paymentMethodId: string) => void;
  busyLabel: string;
  submitLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError("");

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Please check your card details.");
      setSubmitting(false);
      return;
    }

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (confirmError || !setupIntent) {
      setError(confirmError?.message || "Could not save your card. Please try again.");
      setSubmitting(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent.payment_method === "string" ? setupIntent.payment_method : setupIntent.payment_method?.id;
    if (!paymentMethodId) {
      setError("Could not save your card. Please try again.");
      setSubmitting(false);
      return;
    }

    onConfirmed(paymentMethodId);
    // Leave submitting=true — parent takes over the busy state from here.
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
        disabled={!stripe || submitting}
        className="btn-fancy mt-6 px-6 py-3 disabled:opacity-40"
      >
        {submitting ? busyLabel : submitLabel}
      </button>
    </form>
  );
}

export default function StripePaymentForm(props: {
  clientSecret: string;
  onConfirmed: (paymentMethodId: string) => void;
  busyLabel: string;
  submitLabel: string;
}) {
  return (
    <Elements
      stripe={getBrowserStripe()}
      options={{ clientSecret: props.clientSecret, appearance: { theme: "stripe" } }}
    >
      <InnerForm onConfirmed={props.onConfirmed} busyLabel={props.busyLabel} submitLabel={props.submitLabel} />
    </Elements>
  );
}
