"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncNow, updateIcalImportUrl } from "./actions";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-ink/5"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function ExportSection({ feedUrl }: { feedUrl: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Export — your bookings → other platforms</h2>
      <p className="mt-2 text-sm text-ink/60">
        Paste this URL into Sympl (or any channel manager) once. It publishes every direct booking as a blocked
        date range, so Airbnb, Booking.com and Vrbo stay in sync automatically.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-ink/5 px-3 py-2 text-sm">{feedUrl}</code>
        <CopyButton value={feedUrl} />
      </div>
    </div>
  );
}

export function ImportSection({ initialUrl, lastSyncedCount }: { initialUrl: string; lastSyncedCount: number }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateIcalImportUrl(url);
      if (result.ok) {
        setMessage("Saved.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function onSyncNow() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await syncNow();
      if (result.ok) {
        setMessage(`Synced — ${result.count} external block(s) currently on file.`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold">Import — other platforms → your site</h2>
      <p className="mt-2 text-sm text-ink/60">
        The iCal export URL from Sympl (or Airbnb/Booking.com/Vrbo directly). Bookings on it block those dates on
        your own calendar so you never get double-booked.
      </p>
      <form onSubmit={onSave} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://...ics"
          className="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-fancy px-4 py-2 text-sm disabled:opacity-50">
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onSyncNow}
            className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-medium hover:bg-ink/5 disabled:opacity-50"
          >
            Sync now
          </button>
        </div>
      </form>
      <p className="mt-3 text-xs text-ink/40">
        Currently holding {lastSyncedCount} external block(s) from the last sync (auto-refreshes at most every 10
        minutes; "Sync now" forces an immediate check).
      </p>
      {message && <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
