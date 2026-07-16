import type { ReactNode } from "react";

export default function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink/5 py-2.5 text-sm last:border-0">
      <span className="text-ink/45">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
