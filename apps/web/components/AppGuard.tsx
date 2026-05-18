"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "@/lib/api";

export function AppGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data, isLoading, isError } = useSession();

  const authenticated = !!data;

  useEffect(() => {
    if (!isLoading && !authenticated && !isError) {
      router.replace("/login");
    }
  }, [isLoading, authenticated, isError, router]);

  if (isLoading) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }

  if (!authenticated) return null;

  return <>{children}</>;
}
