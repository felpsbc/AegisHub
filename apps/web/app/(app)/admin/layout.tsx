"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { accountFromUser, useSession } from "@/lib/api";

/**
 * Gate de autorização do painel admin. O AppGuard pai só garante que há sessão;
 * aqui exigimos `is_admin` (via accountFromUser === "admin"). Não-admin é mandado
 * para o app comum — a UI nunca renderiza dados administrativos pra quem não pode,
 * e o backend ainda rejeita com 403 de qualquer forma (defesa em profundidade).
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading } = useSession();
  const isAdmin = accountFromUser(data) === "admin";

  useEffect(() => {
    if (!isLoading && data && !isAdmin) {
      router.replace("/app/dashboard");
    }
  }, [isLoading, data, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }

  if (!isAdmin) return null;

  return <>{children}</>;
}
