export type PentesterStatusLike =
  | "open"
  | "busy"
  | "unavailable"
  | "OPEN"
  | "BUSY"
  | "UNAVAILABLE";

export function StatusDot({
  status,
  showLabel = true,
}: {
  status: PentesterStatusLike;
  showLabel?: boolean;
}) {
  const s = String(status).toLowerCase();
  const label =
    s === "open" ? "Aberto a propostas" : s === "busy" ? "Em projeto" : "Indisponível";
  const cls = s === "open" ? "dot-open" : s === "busy" ? "dot-busy" : "dot-offline";
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className={`dot ${cls}`} title={label} />
      {showLabel && (
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{label}</span>
      )}
    </span>
  );
}
