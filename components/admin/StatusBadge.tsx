const STYLES: Record<string, string> = {
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  CHECKED_IN: "bg-sky-100 text-sky-800",
  CHECKED_OUT: "bg-slate-200 text-slate-700",
  CLOSED: "bg-slate-100 text-slate-500",
  REJECTED: "bg-red-100 text-red-700",
  CANCELLED: "bg-red-100 text-red-700",
};

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
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
