"use client";

import Link from "next/link";
import { useState, use } from "react";

import { ApiError, useResetPassword } from "@/lib/api";
import { Field, Input } from "@/components/Field";
import { Logo } from "@/components/Logo";

type Props = {
  params: Promise<{ uidb64: string; token: string }>;
};

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message === "invalid_reset") {
      return "Link inválido ou expirado. Solicite uma nova redefinição de senha.";
    }
    return err.message;
  }
  return "Não foi possível redefinir agora. Tente novamente.";
}

export default function RedefinirSenhaPage({ params }: Props) {
  const { uidb64, token } = use(params);
  const reset = useResetPassword();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    try {
      await reset.mutateAsync({ uidb64, token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <Logo />
          <span className="muted" style={{ fontSize: 12 }}>
            v1.0
          </span>
        </div>

        {done ? (
          <div>
            <h1 className="h2 mb-2">Senha redefinida!</h1>
            <p className="muted mb-4" style={{ fontSize: 14 }}>
              Sua senha foi atualizada. Você já pode entrar com a nova senha.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg btn-block">
              Ir para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <h1 className="h2 mb-2">Criar nova senha</h1>
            <p className="muted mb-4" style={{ fontSize: 14 }}>
              Escolha uma nova senha para sua conta.
            </p>
            <Field label="Nova senha" htmlFor="password" hint="Mínimo 12 caracteres.">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
                autoFocus
              />
            </Field>
            <Field label="Confirmar nova senha" htmlFor="confirm">
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={12}
                required
              />
            </Field>
            {error && (
              <div
                className="mt-1 text-xs"
                style={{ color: "var(--danger)" }}
                role="alert"
              >
                {error}
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 12 }}
              disabled={reset.isPending}
            >
              {reset.isPending ? "Salvando…" : "Redefinir senha"}
            </button>
            <Link
              href="/login"
              className="btn btn-ghost btn-sm btn-block"
              style={{ marginTop: 8 }}
            >
              Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
