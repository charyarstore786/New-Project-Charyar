"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DepositStatus } from "@/lib/booking/depositStatus";
import {
  addDamageClaim,
  approveBooking,
  cancelBooking,
  chargeDeposit,
  deleteBooking,
  placeDeposit,
  rejectBooking,
  releaseDeposit,
  sendConfirmationEmail,
  updateBookingStatus,
  waiveDeposit,
} from "./actions";

const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  APPROVED: [{ value: "CHECKED_IN", label: "Mark checked in" }],
  CHECKED_IN: [{ value: "CHECKED_OUT", label: "Mark checked out" }],
  CHECKED_OUT: [{ value: "CLOSED", label: "Close booking" }],
};

const TERMINAL_STATUSES = ["CANCELLED", "REJECTED", "CLOSED"];
const PRE_APPROVAL_STATUSES = ["PENDING_VERIFICATION", "PENDING_APPROVAL"];

export default function ActionButtons({
  bookingId,
  reference,
  status,
  depositStatus,
  depositAmount,
}: {
  bookingId: string;
  reference: string;
  status: string;
  depositStatus: DepositStatus;
  depositAmount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [depositHoldAmount, setDepositHoldAmount] = useState(String(depositAmount));
  const [claimAmount, setClaimAmount] = useState("");
  const [claimNote, setClaimNote] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeNote, setChargeNote] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function onDelete() {
    startTransition(async () => {
      const result = await deleteBooking(bookingId);
      if (result.ok) {
        router.push("/admin/bookings");
      } else {
        setDeleteError(result.error);
      }
    });
  }

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

        {(depositStatus === "NONE" || depositStatus === "DECLINED" || depositStatus === "WAIVED") &&
          ["APPROVED", "CHECKED_IN", "CHECKED_OUT"].includes(status) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setDepositHoldAmount(String(depositAmount));
                setShowDepositForm((v) => !v);
              }}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
            >
              🔒 {depositStatus === "DECLINED" ? "Retry deposit hold" : depositStatus === "WAIVED" ? "Place deposit hold after all" : "Place deposit hold"}
            </button>
          )}

        {(depositStatus === "NONE" || depositStatus === "DECLINED") &&
          ["APPROVED", "CHECKED_IN", "CHECKED_OUT"].includes(status) && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => waiveDeposit(bookingId), "Deposit waived — no hold will be attempted.")}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
            >
              🤝 Skip deposit for this guest
            </button>
          )}

        {depositStatus === "HELD" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => releaseDeposit(bookingId), "Deposit released.")}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
            >
              🔓 Release deposit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setShowChargeForm((v) => !v)}
              className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              💳 Charge damage
            </button>
          </>
        )}

        <button
          type="button"
          disabled={pending}
          onClick={() => setShowClaimForm((v) => !v)}
          className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
        >
          🧾 Add damage claim
        </button>

        {!TERMINAL_STATUSES.includes(status) && !PRE_APPROVAL_STATUSES.includes(status) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowCancelForm((v) => !v)}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            ✕ Cancel booking
          </button>
        )}
      </div>

      {showChargeForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">
            Captures from the held £{depositAmount} card deposit. This is a real charge.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="text-sm">
              Amount (£)
              <input
                type="number"
                min="1"
                step="0.01"
                value={chargeAmount}
                onChange={(e) => setChargeAmount(e.target.value)}
                className="mt-1 block w-32 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
              />
            </label>
            <label className="flex-1 text-sm">
              Note
              <input
                type="text"
                value={chargeNote}
                onChange={(e) => setChargeNote(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={pending || !chargeAmount || !chargeNote}
            onClick={() => {
              run(
                () => chargeDeposit(bookingId, Math.round(Number(chargeAmount) * 100), chargeNote),
                "Deposit charged.",
              );
              setShowChargeForm(false);
              setChargeAmount("");
              setChargeNote("");
            }}
            className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm charge
          </button>
        </div>
      )}

      {showDepositForm && (
        <div className="rounded-xl border border-ink/15 bg-white p-4">
          <p className="text-sm text-ink/70">
            Defaults to the site's standard £{depositAmount} deposit — lower it for a guest who can only support a
            smaller hold (e.g. £100), or raise it, before confirming.
          </p>
          <label className="mt-3 block text-sm">
            Amount (£)
            <input
              type="number"
              min="1"
              step="0.01"
              value={depositHoldAmount}
              onChange={(e) => setDepositHoldAmount(e.target.value)}
              className="mt-1 block w-32 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            disabled={pending || !depositHoldAmount || Number(depositHoldAmount) <= 0}
            onClick={() => {
              run(
                () => placeDeposit(bookingId, Math.round(Number(depositHoldAmount) * 100)),
                "Deposit hold placed.",
              );
              setShowDepositForm(false);
            }}
            className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/80 disabled:opacity-50"
          >
            Confirm hold
          </button>
        </div>
      )}

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

      {showCancelForm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-900">
            Marks the booking cancelled and releases any uncaptured authorization or deposit hold. If the stay total
            was already captured, that's a real charge you'll need to refund manually via Stripe — this doesn't do
            that automatically.
          </p>
          <label className="mt-3 block text-sm font-medium text-red-900">
            Reason (optional, kept as an internal note)
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              run(() => cancelBooking(bookingId, cancelReason), "Booking cancelled.");
              setShowCancelForm(false);
            }}
            className="mt-3 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm cancel
          </button>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-red-200 bg-red-50/50 p-4">
        <p className="text-sm font-semibold text-red-900">Danger zone</p>
        <p className="mt-1 text-sm text-red-800">
          Permanently deletes this booking and its guest, emails, damage claims and activity log. This cannot be
          undone — it does not cancel any Stripe authorization or release a deposit hold first.
        </p>
        {!showDeleteForm ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setShowDeleteForm(true)}
            className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            🗑 Delete booking
          </button>
        ) : (
          <div className="mt-3">
            <label className="block text-sm font-medium text-red-900">
              Type <span className="font-mono">{reference}</span> to confirm
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="mt-1 w-full max-w-xs rounded-lg border border-red-300 bg-white px-3 py-2 text-sm outline-none focus:border-red-500"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending || deleteConfirmText !== reference}
                onClick={onDelete}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setShowDeleteForm(false);
                  setDeleteConfirmText("");
                  setDeleteError(null);
                }}
                className="rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {deleteError && <p className="mt-2 text-sm font-medium text-red-700">{deleteError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
