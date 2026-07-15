"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createManualBlock, deleteManualBlock } from "./actions";

export type ManualBlockRow = {
  id: string;
  start: string;
  end: string;
  summary: string | null;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BlockDatesForm({ blocks }: { blocks: ManualBlockRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createManualBlock({ startDate, endDate, note });
      if (result.ok) {
        setMessage("Dates blocked.");
        setNote("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteManualBlock(id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Block dates</h2>
      <p className="mt-1 text-sm text-ink/50">
        Mark nights unavailable without creating a booking — e.g. personal use or maintenance.
      </p>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">End date (exclusive)</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Personal use, maintenance"
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={pending} className="btn-fancy px-5 py-2.5 text-sm disabled:opacity-50">
            {pending ? "Blocking…" : "Block dates"}
          </button>
          {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
        </div>
      </form>

      {blocks.length > 0 && (
        <div className="mt-6 border-t border-ink/10 pt-4">
          <h3 className="text-sm font-semibold text-ink/70">Currently blocked by you</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 border-b border-ink/5 py-1.5 last:border-0">
                <span>
                  {b.start} → {b.end}
                  {b.summary && <span className="text-ink/50"> · {b.summary}</span>}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDelete(b.id)}
                  className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
