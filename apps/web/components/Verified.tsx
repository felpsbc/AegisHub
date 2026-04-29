export function Verified({
  title = "Pentester verificado pela AegisHub",
}: {
  title?: string;
}) {
  return (
    <span className="verified" title={title} aria-label={title}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="currentColor" />
        <path
          d="M8 12.5 L11 15 L16.5 9.5"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
