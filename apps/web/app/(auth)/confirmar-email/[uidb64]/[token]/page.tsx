"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";

import { Logo } from "@/components/Logo";
import { ApiError, useConfirmEmail } from "@/lib/api";

type Status = "loading" | "ok" | "error";

type Props = {
  params: Promise<{ uidb64: string; token: string }>;
};

export default function ConfirmarEmailPage({ params }: Props) {
  const { uidb64, token } = use(params);
  const confirm = useConfirmEmail();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    confirm
      .mutateAsync({ uidb64, token })
      .then(() => {
        if (!cancelled) setStatus("ok");
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        if (err instanceof ApiError) {
          setErrorMsg(
            err.message === "invalid_confirmation"
              ? "Link inválido ou expirado. Solicite um novo e-mail de confirmação."
              : err.message,
          );
        } else {
          setErrorMsg("Não foi possível confirmar agora. Tente novamente.");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uidb64, token]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <Logo />
          <span className="muted" style={{ fontSize: 12 }}>
            v1.0
          </span>
        </div>
        {status === "loading" && (
          <p className="muted" style={{ fontSize: 14 }}>
            Confirmando seu e-mail…
          </p>
        )}
        {status === "ok" && (
          <>
            <h1 className="h2 mb-2">E-mail confirmado!</h1>
            <p className="muted mb-4" style={{ fontSize: 14 }}>
              Sua conta está ativa. Você já pode fazer login.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg btn-block">
              Ir para o login
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="h2 mb-2">Não foi possível confirmar</h1>
            <p className="muted mb-4" style={{ fontSize: 14 }}>
              {errorMsg}
            </p>
            <Link href="/login" className="btn btn-lg btn-block">
              Voltar ao login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
