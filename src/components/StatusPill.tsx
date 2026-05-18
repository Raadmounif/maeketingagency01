/** Status badge colors for tables on white backgrounds (ignores dark-mode body text). */
export function pillClassForStatus(status: string) {
  const s = status.toLowerCase();
  if (s.includes("complete") || s.includes("done") || s.includes("success")) {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (s.includes("fail") || s.includes("cancel") || s.includes("reject") || s.includes("refund")) {
    return "bg-rose-50 text-rose-800 border-rose-200";
  }
  if (s.includes("pending") || s.includes("process") || s.includes("progress") || s.includes("ordered")) {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }
  if (s.includes("partial")) {
    return "bg-sky-50 text-sky-800 border-sky-200";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        pillClassForStatus(status),
      ].join(" ")}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
