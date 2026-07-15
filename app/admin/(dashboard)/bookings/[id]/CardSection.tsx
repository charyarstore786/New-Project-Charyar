"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import StripePaymentForm from "@/components/booking/StripePaymentForm";
import { stripeConfigured } from "@/lib/stripe/browserClient";
import { formatGbp } from "@/lib/booking/format";
import { attachCard, chargeStayTotal } from "./actions";

type Props = {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  total: number;
  hasCard: boolean;
  alreadyCharged: boolean;
};

export default function CardSection({ bookingId, guestName, guestEmail, total, hasCard, alreadyCharged }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [collecting, setCollecting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pendingCard, setPendingCard] = useState<{ customerId: string; setupIntentId: string } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function saveCard(customerId: string, setupIntentId: string) {
    startTransition(async () => {
      await attachCard(bookingId, customerId, setupIntentId);
      setCollecting(false);
      setClientSecret(null);
      setMessage("Card saved.");
      router.refresh();
    });
  }

  async function startCollecting() {
    setError("");
    setCollecting(true);
    try {
      const custRes = await fetch("/api/stripe/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: guestName, email: guestEmail }),
      });
      const custData = await custRes.json().catch(() => ({}));
      if (!custRes.ok) throw new Error(custData.error || "Could not start card setup.");

      const setiRes = await fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: custData.customerId }),
      });
      const setiData = await setiRes.json().catch(() => ({}));
      if (!setiRes.ok) throw new Error(setiData.error || "Could not start card setup.");

      if (!stripeConfigured) {
        // No Stripe key configured — simulate immediately, nothing to render a real card form for.
        saveCard(custData.customerId, setiData.setupIntentId);
        return;
      }

      setPendingCard({ customerId: custData.customerId, setupIntentId: setiData.setupIntentId });
      setClientSecret(setiData.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCollecting(false);
    }
  }

  function onChargeNow() {
    startTransition(async () => {
      await chargeStayTotal(bookingId);
      setMessage("Charge attempted — see the activity log below for the result.");
      router.refresh();
    });
  }

  if (alreadyCharged) return null;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Card on file</h2>
      {message && <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}

      {!hasCard && !collecting && (
        <>
          <p className="mt-2 text-sm text-ink/60">
            No card saved yet — optional. Add one if you want the option to place a damage-deposit hold or charge
            the stay total later.
          </p>
          <button
            type="button"
            onClick={startCollecting}
            className="btn-fancy mt-4 px-4 py-2 text-sm"
          >
            💳 Add card on file
          </button>
        </>
      )}

      {!hasCard && collecting && (
        clientSecret ? (
          <div className="mt-4">
            <StripePaymentForm
              clientSecret={clientSecret}
              onConfirmed={() => pendingCard && saveCard(pendingCard.customerId, pendingCard.setupIntentId)}
              busyLabel="Saving…"
              submitLabel="Save card"
              busy={pending}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink/50">{pending ? "Saving…" : "Loading secure card form…"}</p>
        )
      )}

      {hasCard && (
        <>
          <p className="mt-2 text-sm text-emerald-700">✓ Card saved for this guest.</p>
          <p className="mt-1 text-sm text-ink/60">
            Entirely optional — charge the stay total ({formatGbp(total)}) now, or leave it and just use the deposit
            hold below.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={onChargeNow}
            className="btn-fancy mt-4 px-4 py-2 text-sm disabled:opacity-50"
          >
            {pending ? "Charging…" : `💷 Charge ${formatGbp(total)} now`}
          </button>
        </>
      )}
    </section>
  );
}
