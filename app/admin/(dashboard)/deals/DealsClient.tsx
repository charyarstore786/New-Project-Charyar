"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Card from "@/components/admin/Card";
import { createDeal, deleteDeal, toggleDealActive, updateDeal, type DealType } from "./actions";

export type DealRow = {
  id: string;
  name: string;
  startDate: string; // "yyyy-mm-dd"
  endDate: string;
  type: DealType;
  value: number; // pence for FIXED_RATE, percentage for PERCENTAGE_OFF
  active: boolean;
};

function formatValue(type: DealType, value: number): string {
  return type === "PERCENTAGE_OFF" ? `${value}% off` : `£${(value / 100).toFixed(2)}/night`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function DealsClient({ deals }: { deals: DealRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [type, setType] = useState<DealType>("PERCENTAGE_OFF");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setName("");
    setStartDate(today());
    setEndDate(today());
    setType("PERCENTAGE_OFF");
    setValue("");
  }

  function onEdit(d: DealRow) {
    setError(null);
    setMessage(null);
    setEditingId(d.id);
    setName(d.name);
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setType(d.type);
    setValue(d.type === "FIXED_RATE" ? String(d.value / 100) : String(d.value));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const numValue = Number(value);
    startTransition(async () => {
      const result = editingId
        ? await updateDeal(editingId, { name, startDate, endDate, type, value: numValue })
        : await createDeal({ name, startDate, endDate, type, value: numValue });
      if (result.ok) {
        setMessage(editingId ? "Deal updated." : "Deal created.");
        resetForm();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function onToggle(id: string, active: boolean) {
    startTransition(async () => {
      await toggleDealActive(id, active);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteDeal(id);
      router.refresh();
    });
  }

  const now = today();

  return (
    <div className="space-y-8">
      <Card as="section" className="p-6">
        <form onSubmit={onSubmit}>
        <h2 className="font-display text-lg font-semibold">{editingId ? "Edit deal" : "New deal"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. August off-season"
              className="admin-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Start date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="admin-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">End date (exclusive)</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="admin-input mt-1 w-full"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as DealType)}
              className="admin-input mt-1 w-full"
            >
              <option value="PERCENTAGE_OFF">Percentage off</option>
              <option value="FIXED_RATE">Fixed nightly rate</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">{type === "PERCENTAGE_OFF" ? "Percentage (1-100)" : "Rate (£/night)"}</span>
            <input
              type="number"
              min="0"
              step={type === "PERCENTAGE_OFF" ? "1" : "0.01"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="admin-input mt-1 w-full"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" disabled={pending} className="admin-btn admin-btn-primary">
            {pending ? "Saving…" : editingId ? "Save changes" : "Create deal"}
          </button>
          {editingId && (
            <button type="button" disabled={pending} onClick={resetForm} className="admin-btn admin-btn-outline">
              Cancel
            </button>
          )}
          {message && <p className="text-sm font-medium text-emerald-700">{message}</p>}
          {error && <p className="text-sm font-medium text-red-700">{error}</p>}
        </div>
        <p className="mt-3 text-xs text-ink/40">
          If deals overlap the same night, the earliest-created deal wins — avoid overlapping date ranges.
        </p>
        </form>
      </Card>

      <div>
        <h2 className="font-display text-lg font-semibold">All deals</h2>
        {deals.length === 0 ? (
          <p className="mt-3 text-sm text-ink/50">No deals yet.</p>
        ) : (
          <Card className="mt-3 overflow-hidden p-0">
            {deals.map((d) => {
              const expired = d.endDate <= now;
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/5 px-5 py-4 last:border-0">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-sm text-ink/50">
                      {d.startDate} → {d.endDate} · {formatValue(d.type, d.value)}
                      {expired && " · expired"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`admin-badge border ${d.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-ink/10 bg-ink/5 text-ink/50"}`}>
                      <span className={`admin-badge-dot ${d.active ? "bg-emerald-500" : "bg-ink/30"}`} aria-hidden />
                      {d.active ? "Live now" : "Turned off"}
                    </span>
                    <button
                      disabled={pending}
                      onClick={() => onEdit(d)}
                      className="admin-btn admin-btn-outline admin-btn-sm"
                    >
                      Edit
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => onToggle(d.id, !d.active)}
                      className="admin-btn admin-btn-outline admin-btn-sm"
                    >
                      {d.active ? "Turn off" : "Turn on"}
                    </button>
                    <button
                      disabled={pending}
                      onClick={() => onDelete(d.id)}
                      className="admin-btn admin-btn-danger-outline admin-btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
