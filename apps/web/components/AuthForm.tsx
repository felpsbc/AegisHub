"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building, Shield } from "lucide-react";

import {
  accountFromUser,
  useLogin,
  useLoginMfa,
  useRegister,
  type Account,
  type User,
} from "@/lib/api";

import { Field, Input } from "./Field";
import { Logo } from "./Logo";
import { Pill } from "./Pill";

export type AuthMode = "login" | "cadastro";
type Tipo = "empresa" | "pentester";

type LandingRoute =
  | "/admin"
  | "/app/pentesters"
  | "/app/propostas"
  | "/app/dashboard";

function destinationFor(account: Account | null): LandingRoute {
  switch (account) {
    case "admin":
      return "/admin";
    case "empresa":
      return "/app/pentesters";
    case "pentester":
      return "/app/propostas";
    default:
      return "/app/dashboard";
  }
}

function landingFor(user: User): LandingRoute {
  return destinationFor(accountFromUser(user));
}

function describeError(err: unknown): string {
  if (!err) return "Falha inesperada. Tente novamente.";
  const msg = (err as { message?: string }).message ?? "";
  const map: Record<string, string> = {
    invalid_credentials: "E-mail ou senha incorretos.",
    inactive: "Conta desativada. Fale com o suporte.",
    invalid_mfa: "Código inválido.",
    no_pending_mfa: "Sessão de login expirou. Faça login novamente.",
    pending_mfa_expired: "Tempo para informar o código expirou. Faça login novamente.",
    mfa_not_setup: "MFA não configurado para essa conta.",
  };
  return map[msg] ?? msg ?? "Não foi possível processar a solicitação.";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();

  const [tipo, setTipo] = useState<Tipo>("empresa");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [fullName, setFullName] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [stage, setStage] = useState<"form" | "mfa">("form");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();
  const loginMfa = useLoginMfa();
  const register = useRegister();

  const busy = login.isPending || loginMfa.isPending || register.isPending;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "login") {
      try {
        const result = await login.mutateAsync({ email, password });
        if (result.kind === "mfa_required") {
          setStage("mfa");
          return;
        }
        router.replace(landingFor(result.user));
      } catch (err) {
        setError(describeError(err));
      }
      return;
    }

    try {
      const payload =
        tipo === "empresa"
          ? {
              email,
              password,
              full_name: fullName,
              tenant_type: "COMPANY" as const,
              legal_name: legalName,
              document,
              document_kind: "CNPJ" as const,
            }
          : {
              email,
              password,
              full_name: fullName,
              tenant_type: "INDIVIDUAL" as const,
              legal_name: fullName,
              document,
              document_kind: "CPF" as const,
            };
      await register.mutateAsync(payload);
      const auto = await login.mutateAsync({ email, password });
      if (auto.kind === "mfa_required") {
        setStage("mfa");
        return;
      }
      router.replace(landingFor(auto.user));
    } catch (err) {
      setError(describeError(err));
    }
  };

  const onMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const user = await loginMfa.mutateAsync({ code: mfaCode });
      router.replace(landingFor(user));
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

        {stage === "mfa" ? (
          <form onSubmit={onMfa}>
            <p className="muted mb-4" style={{ fontSize: 13 }}>
              Informe o código de 6 dígitos do seu app autenticador, ou um código
              de backup.
            </p>
            <Field label="Código" htmlFor="mfa">
              <Input
                id="mfa"
                inputMode="text"
                autoComplete="one-time-code"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                minLength={6}
                maxLength={16}
                autoFocus
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
              disabled={busy}
            >
              {busy ? "Verificando…" : "Confirmar"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-block"
              style={{ marginTop: 8 }}
              onClick={() => {
                setStage("form");
                setMfaCode("");
                setError(null);
              }}
            >
              Voltar
            </button>
          </form>
        ) : (
          <>
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
                    <Input
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      autoComplete="organization"
                      required
                      minLength={2}
                    />
                  </Field>
                  <Field label="CNPJ">
                    <Input
                      value={document}
                      onChange={(e) => setDocument(e.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                      required
                    />
                  </Field>
                  <Field label="Nome do responsável">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      required
                      minLength={2}
                    />
                  </Field>
                </>
              )}
              {mode === "cadastro" && tipo === "pentester" && (
                <>
                  <Field label="Nome completo">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      required
                      minLength={2}
                    />
                  </Field>
                  <Field label="CPF">
                    <Input
                      value={document}
                      onChange={(e) => setDocument(e.target.value)}
                      inputMode="numeric"
                      autoComplete="off"
                      required
                    />
                  </Field>
                </>
              )}

              <Field label="E-mail" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete={mode === "login" ? "email" : "off"}
                  required
                />
              </Field>
              <Field
                label="Senha"
                htmlFor="password"
                hint={mode === "cadastro" ? "Mínimo 12 caracteres." : undefined}
              >
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
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
                disabled={busy}
              >
                {busy
                  ? mode === "login"
                    ? "Entrando…"
                    : "Criando conta…"
                  : mode === "login"
                    ? "Entrar"
                    : "Criar conta"}
              </button>
            </form>

            <div
              className="muted mt-4"
              style={{ fontSize: 12, textAlign: "center" }}
            >
              Ao continuar você concorda com os Termos e a Política de privacidade.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
