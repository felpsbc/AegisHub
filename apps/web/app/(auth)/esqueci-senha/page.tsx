"use client";

import Link from "next/link";
import { useState } from "react";

import { useRequestPasswordReset } from "@/lib/api";
import { Field, Input } from "@/components/Field";
import { Logo } from "@/components/Logo";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const request = useRequestPasswordReset();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await request.mutateAsync({ email });
    } catch {
      // Endpoint responde 202 mesmo para e-mail inexistente (não vaza existência);
      // qualquer erro de rede não deve mudar a mensagem mostrada ao usuário.
    }
    setSent(true);
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

        {sent ? (
          <div>
            <h1 className="h2 mb-2">Verifique seu e-mail</h1>
            <p className="muted mb-4" style={{ fontSize: 14 }}>
              Se houver uma conta associada a <strong>{email}</strong>, enviamos um
              link para redefinir a senha. O link expira em 1 hora.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg btn-block">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <h1 className="h2 mb-2">Esqueceu a senha?</h1>
            <p className="muted mb-4" style={{ fontSize: 14 }}>
              Informe o e-mail da sua conta e enviaremos um link para você criar
              uma nova senha.
            </p>
            <Field label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </Field>
            <button
              type="submit"
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 12 }}
              disabled={request.isPending}
            >
              {request.isPending ? "Enviando…" : "Enviar link de redefinição"}
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
