"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addDamageClaim,
  approveBooking,
  rejectBooking,
  sendConfirmationEmail,
  updateBookingStatus,
} from "./actions";

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  APPROVED: [{ value: "CHECKED_IN", label: "Mark checked in" }],
  CHECKED_IN: [{ value: "CHECKED_OUT", label: "Mark checked out" }],
  CHECKED_OUT: [{ value: "CLOSED", label: "Close booking" }],
};

export default function ActionButtons({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [reason, setReason] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<void>, ok: string) {
    startTransition(async () => {
      await action();
      setMessage(ok);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}

      <div className="flex flex-wrap gap-2">
        {status === "PENDING_APPROVAL" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approveBooking(bookingId), "Booking approved — confirmation email logged.")}
              className="btn-fancy px-4 py-2 text-sm disabled:opacity-50"
            >
              ✓ Approve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowRejectForm((v) => !v)}
              className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              ✕ Reject
            </button>
          </>
        )}

        {NEXT_STATUS[status]?.map((next) => (
          <button
            key={next.value}
            type="button"
            disabled={pending}
            onClick={() => run(() => updateBookingStatus(bookingId, next.value), `Status updated to ${next.value}.`)}
            className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
          >
            {next.label}
          </button>
        ))}

        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => sendConfirmationEmail(bookingId), "Confirmation email (re)logged.")}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
        >
          ✉ Resend confirmation
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => setShowClaimForm((v) => !v)}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
        >
          🧾 Add damage claim
        </button>
      </div>

      {showRejectForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <label className="block text-sm font-medium text-red-900">
            Reason (optional, kept as an internal note)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              run(() => rejectBooking(bookingId, reason), "Booking rejected — authorization released.");
              setShowRejectForm(false);
            }}
            className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm reject
          </button>
        </div>
      )}

      {showClaimForm && (
        <div className="rounded-xl border border-ink/15 bg-white p-4">
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Amount (£)
              <input
                type="number"
                min="1"
                step="0.01"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                className="mt-1 block w-32 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex-1 text-sm">
              Note
              <input
                type="text"
                value={claimNote}
                onChange={(e) => setClaimNote(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending || !claimAmount || !claimNote}
            onClick={() => {
              run(
                () => addDamageClaim(bookingId, Math.round(Number(claimAmount) * 100), claimNote),
                "Damage claim recorded.",
              );
              setShowClaimForm(false);
              setClaimAmount("");
              setClaimNote("");
            }}
            className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/80 disabled:opacity-50"
          >
            Record claim
          </button>
        </div>
      )}
    </div>
  );
}
