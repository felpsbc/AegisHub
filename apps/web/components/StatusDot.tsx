import type { PentesterStatus } from "@/lib/mock";

export function StatusDot({
  status,
  showLabel = true,
}: {
  status: PentesterStatus;
  showLabel?: boolean;
}) {
  const label = status === "open" ? "Aberto a propostas" : "Em projeto";
  return (
    <span className="row" style={{ gap: 6 }}>
      <span
        className={`dot ${status === "open" ? "dot-open" : "dot-busy"}`}
        title={label}
      />
      {showLabel && (
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
      )}
    </span>
  );
}
