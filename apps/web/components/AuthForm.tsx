"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building, Shield } from "lucide-react";

import { Field, Input } from "./Field";
import { Logo } from "./Logo";
import { Pill } from "./Pill";
import { useAuth } from "@/lib/store";

export type AuthMode = "login" | "cadastro";
type Tipo = "empresa" | "pentester";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const setAccount = useAuth((s) => s.setAccount);
  const [tipo, setTipo] = useState<Tipo>("empresa");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const acct = mode === "cadastro" ? tipo : "empresa";
    setAccount(acct);
    router.push(acct === "empresa" ? "/app/pentesters" : "/app/propostas");
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

        <div className="auth-tabs" role="tablist">
          <Link
            href="/login"
            role="tab"
            aria-selected={mode === "login"}
            className={mode === "login" ? "active" : ""}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 500,
              background: mode === "login" ? "var(--surface)" : "transparent",
              color: mode === "login" ? "var(--text)" : "var(--text-2)",
            }}
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            role="tab"
            aria-selected={mode === "cadastro"}
            className={mode === "cadastro" ? "active" : ""}
            style={{
              flex: 1,
              height: 32,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 500,
              background: mode === "cadastro" ? "var(--surface)" : "transparent",
              color: mode === "cadastro" ? "var(--text)" : "var(--text-2)",
            }}
          >
            Criar conta
          </Link>
        </div>

        <form onSubmit={onSubmit}>
          {mode === "cadastro" && (
            <div className="mb-4">
              <span className="label">Tipo de conta</span>
              <div className="row gap-2">
                <Pill
                  active={tipo === "empresa"}
                  onClick={() => setTipo("empresa")}
                >
                  <Building size={12} /> Empresa
                </Pill>
                <Pill
                  active={tipo === "pentester"}
                  onClick={() => setTipo("pentester")}
                >
                  <Shield size={12} /> Pentester
                </Pill>
              </div>
            </div>
          )}

          {mode === "cadastro" && tipo === "empresa" && (
            <>
              <Field label="Razão social">
                <Input defaultValue="Banco Lumen S/A" />
              </Field>
              <Field label="CNPJ">
                <Input defaultValue="23.451.882/0001-09" />
              </Field>
            </>
          )}
          {mode === "cadastro" && tipo === "pentester" && (
            <>
              <Field label="Nome completo">
                <Input defaultValue="Mariana Albuquerque" />
              </Field>
              <Field label="CPF">
                <Input defaultValue="123.456.789-00" />
              </Field>
            </>
          )}

          <Field label="E-mail" htmlFor="email">
            <Input id="email" type="email" defaultValue="voce@empresa.com.br" />
          </Field>
          <Field label="Senha" htmlFor="password">
            <Input id="password" type="password" defaultValue="••••••••••" />
          </Field>

          <button
            type="submit"
            className="btn btn-primary btn-lg btn-block"
            style={{ marginTop: 12 }}
          >
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div
          className="muted mt-4"
          style={{ fontSize: 12, textAlign: "center" }}
        >
          Ao continuar você concorda com os Termos e a Política de privacidade.
        </div>
      </div>
    </div>
  );
}
