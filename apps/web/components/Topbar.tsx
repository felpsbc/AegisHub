"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogOut, Moon, Sun } from "lucide-react";

import { accountFromUser, useLogout, useSession } from "@/lib/api";
import { useTheme } from "@/lib/store";

import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

export function Topbar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const theme = useTheme((s) => s.theme);
  const toggleTheme = useTheme((s) => s.toggle);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: user } = useSession();
  const logout = useLogout();
  const account = accountFromUser(user);

  const inApp = pathname.startsWith("/app") || pathname.startsWith("/admin");
  const onCatalog =
    pathname.startsWith("/app/pentesters") || pathname.startsWith("/app/propostas");
  const catView = pathname.startsWith("/app/pentesters") ? "pentesters" : "propostas";

  const displayName = user
    ? account === "empresa"
      ? user.memberships.find((m) => m.tenant.type === "COMPANY")?.tenant.legal_name ??
        user.full_name
      : user.full_name
    : null;

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <div className="topbar">
      <div className="container-x topbar-inner">
        <Link href="/" aria-label="AegisHub">
          <Logo />
        </Link>

        {mounted && inApp && user && account !== "admin" && (
          <div className="toggle" role="tablist" aria-label="Modo de visualização">
            <button
              className={catView === "pentesters" && onCatalog ? "active" : ""}
              onClick={() => router.push("/app/pentesters")}
              role="tab"
              aria-selected={catView === "pentesters" && onCatalog}
            >
              Pentesters
            </button>
            <button
              className={catView === "propostas" && onCatalog ? "active" : ""}
              onClick={() => router.push("/app/propostas")}
              role="tab"
              aria-selected={catView === "propostas" && onCatalog}
            >
              Propostas
            </button>
          </div>
        )}

        {mounted && inApp && user && (
          <nav className="nav">
            <Link
              href="/app/dashboard"
              className={pathname === "/app/dashboard" ? "active" : ""}
            >
              Dashboard
            </Link>
            {account === "admin" && (
              <Link href="/admin" className={pathname.startsWith("/admin") ? "active" : ""}>
                Admin
              </Link>
            )}
            <Link
              href="/app/perfil"
              className={pathname === "/app/perfil" ? "active" : ""}
            >
              Perfil
            </Link>
          </nav>
        )}

        <div className="spacer" />

        {!inApp && (
          <div className="row gap-2">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Alternar tema"
              title="Alternar tema"
              type="button"
              suppressHydrationWarning
            >
              {mounted ? (
                theme === "dark" ? <Sun size={15} /> : <Moon size={15} />
              ) : (
                <Moon size={15} />
              )}
            </button>
            <Link href="/login" className="btn btn-ghost btn-sm">
              Entrar
            </Link>
            <Link href="/cadastro" className="btn btn-primary btn-sm">
              Criar conta
            </Link>
          </div>
        )}

        {mounted && inApp && user && displayName && (
          <div className="row gap-3">
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label="Alternar tema"
              title="Alternar tema"
              type="button"
              suppressHydrationWarning
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="icon-btn" aria-label="Notificações" type="button">
              <Bell size={16} />
            </button>
            <button
              className="icon-btn"
              aria-label="Sair"
              title="Sair"
              type="button"
              onClick={handleLogout}
              disabled={logout.isPending}
            >
              <LogOut size={16} />
            </button>
            <Link href="/app/perfil" aria-label="Conta">
              <Avatar name={displayName} size="sm" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
