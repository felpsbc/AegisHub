"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/store";

export function AppGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const account = useAuth((s) => s.account);
  const hydrated = useAuth((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !account) {
      router.replace("/login");
    }
  }, [hydrated, account, router]);

  if (!hydrated) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }

  if (!account) return null;

  return <>{children}</>;
}
