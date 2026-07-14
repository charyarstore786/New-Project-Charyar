"use client";

import { useState, useTransition } from "react";
import { updateSettings, type SettingsInput } from "./actions";

function Field({
  label,
  hint,
  prefix,
  value,
  onChange,
  step,
  min,
}: {
  label: string;
  hint?: string;
  prefix?: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  min?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        {prefix && <span className="text-ink/50">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min ?? 0}
          step={step ?? "1"}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </label>
  );
}

export default function SettingsForm({ initial }: { initial: SettingsInput }) {
  const [values, setValues] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof SettingsInput>(key: K, value: number) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateSettings(values);
      if (result.ok) {
        setMessage("Saved — live on the site now.");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Nightly rate"
          prefix="£"
          value={values.nightlyRate}
          onChange={(v) => set("nightlyRate", v)}
          step="0.01"
          min={0.01}
        />
        <Field
          label="Cleaning fee"
          prefix="£"
          value={values.cleaningFee}
          onChange={(v) => set("cleaningFee", v)}
          step="0.01"
        />
        <Field
          label="Damage deposit"
          hint="Held on the guest's card at check-in, not charged unless there's damage."
          prefix="£"
          value={values.deposit}
          onChange={(v) => set("deposit", v)}
          step="0.01"
        />
        <Field
          label="Max guests"
          value={values.maxGuests}
          onChange={(v) => set("maxGuests", v)}
          min={1}
        />
        <Field
          label="Minimum nights"
          value={values.minNights}
          onChange={(v) => set("minNights", v)}
          min={1}
        />
        <Field
          label="Maximum nights"
          value={values.maxNights}
          onChange={(v) => set("maxNights", v)}
          min={1}
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-fancy px-6 py-2.5 text-sm disabled:opacity-50">
          {pending ? "Saving…" : "Save changes"}
        </button>
        {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
      </div>
    </form>
  );
}
