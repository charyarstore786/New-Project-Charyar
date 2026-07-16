import type { ReactNode } from "react";
import Card from "./Card";

export default function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card hover className="p-5">
      <div className="flex items-start justify-between">
        <p className="admin-eyebrow">{label}</p>
        {icon && (
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
            {icon}
          </span>
        )}
      </div>
      <p className="admin-stat-value mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/40">{hint}</p>}
    </Card>
  );
}
