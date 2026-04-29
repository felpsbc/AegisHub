export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="logo">
      <span className="logo-mark">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M3 13 L8 3 L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
          <path d="M5.5 9 L10.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
        </svg>
      </span>
      {!small && <span>aegishub</span>}
    </span>
  );
}
