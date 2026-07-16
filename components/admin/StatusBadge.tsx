const STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  PENDING_VERIFICATION: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  PENDING_APPROVAL: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
  APPROVED: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", dot: "bg-emerald-500" },
  CHECKED_IN: { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200", dot: "bg-sky-500" },
  CHECKED_OUT: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500" },
  CLOSED: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", dot: "bg-slate-400" },
  REJECTED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
};

const FALLBACK = { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" };

const LABELS: Record<string, string> = {
  PENDING_VERIFICATION: "Pending verification",
  PENDING_APPROVAL: "Needs approval",
  APPROVED: "Approved",
  CHECKED_IN: "Checked in",
  CHECKED_OUT: "Checked out",
  CLOSED: "Closed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export default function StatusBadge({ status }: { status: string }) {
  const s = STYLES[status] ?? FALLBACK;
  return (
    <span className={`admin-badge border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`admin-badge-dot ${s.dot}`} aria-hidden />
      {LABELS[status] ?? status}
    </span>
  );
}
