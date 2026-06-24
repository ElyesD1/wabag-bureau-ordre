function statusClass(s: string): string {
  const v = s.toLowerCase();
  if (v.includes("clos") || v.includes("clo") || v.includes("livr") || v.includes("closed")) return "ok";
  if (v.includes("attente") || v.includes("pending")) return "warn";
  if (v.includes("annul") || v.includes("cancel")) return "danger";
  return "info";
}

export function StatusChip({ value }: { value: string | null }) {
  if (!value) return <span className="status none">—</span>;
  return <span className={`status ${statusClass(value)}`}>{value}</span>;
}
