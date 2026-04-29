import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "0.5px solid var(--border)",
        padding: "24px 0",
        marginTop: 32,
      }}
    >
      <div
        className="container-x row"
        style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}
      >
        <Logo />
        <div className="muted" style={{ fontSize: 12 }}>
          © {new Date().getFullYear()} AegisHub · Termos · Privacidade · Comunidade
        </div>
      </div>
    </footer>
  );
}
