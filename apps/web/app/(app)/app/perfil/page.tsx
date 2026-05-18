"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Field, Input, Textarea } from "@/components/Field";
import { Pill } from "@/components/Pill";
import { Verified } from "@/components/Verified";
import { accountFromUser, useSession, type User } from "@/lib/api";
import { useToast } from "@/lib/store";

export default function PerfilPage() {
  const { data: user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }
  if (!user) return null;

  const account = accountFromUser(user);
  if (account === "pentester") return <PentesterPerfil user={user} />;
  if (account === "empresa") return <EmpresaPerfil user={user} />;
  return <AdminPerfil user={user} />;
}

function PentesterPerfil({ user }: { user: User }) {
  const showToast = useToast((s) => s.show);
  const [rate, setRate] = useState(280);
  const [status, setStatus] = useState<"open" | "busy">("open");

  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Seu perfil</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={user.full_name} size="lg" />
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <div className="row gap-2">
              <strong style={{ fontWeight: 500 }}>{user.full_name}</strong>
              {user.mfa_enabled && <Verified title="MFA ativado" />}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {user.email}
            </span>
          </div>
        </div>
        <hr className="hr" />

        <div className="row gap-3 mb-4 flex-wrap">
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className="label">Status</span>
            <div className="toggle">
              <button
                className={status === "open" ? "active" : ""}
                onClick={() => {
                  setStatus("open");
                  showToast("Agora aberto a propostas");
                }}
                type="button"
              >
                <span className="dot dot-open" />
                Aberto
              </button>
              <button
                className={status === "busy" ? "active" : ""}
                onClick={() => {
                  setStatus("busy");
                  showToast("Status: em projeto");
                }}
                type="button"
              >
                <span className="dot dot-busy" />
                Em projeto
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className="label">Valor por hora — R$ {rate}</span>
            <input
              className="range"
              type="range"
              min={180}
              max={500}
              step={10}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>
        </div>

        <Field label="Bio">
          <Textarea rows={3} placeholder="Conte um pouco sobre você e seu trabalho." />
        </Field>

        <div className="row gap-3 mt-4">
          <div style={{ flex: 1 }}>
            <Field label="Cidade">
              <Input placeholder="Cidade, UF" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Idiomas">
              <Input placeholder="Português, Inglês" />
            </Field>
          </div>
        </div>

        <div className="mt-4">
          <span className="label">Especialidades</span>
          <div className="chips">
            <Pill>
              <Plus size={11} /> adicionar
            </Pill>
          </div>
        </div>

        <div className="mt-4">
          <span className="label">Certificações</span>
          <div className="chips">
            <Pill>
              <Plus size={11} /> enviar para verificação
            </Pill>
          </div>
        </div>

        <div className="row mt-6" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => showToast("Perfil atualizado")}
          >
            Salvar alterações
          </button>
        </div>
      </div>
    </div>
  );
}

function EmpresaPerfil({ user }: { user: User }) {
  const showToast = useToast((s) => s.show);
  const tenant = user.memberships.find((m) => m.tenant.type === "COMPANY")?.tenant;
  const legalName = tenant?.legal_name ?? user.full_name;

  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Perfil da empresa</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={legalName} size="lg" />
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <strong style={{ fontWeight: 500 }}>{legalName}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {user.email}
            </span>
          </div>
        </div>
        <hr className="hr" />
        <div className="row gap-3 mb-2 flex-wrap">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="CNPJ">
              <Input placeholder="00.000.000/0000-00" />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="Setor">
              <Input placeholder="Ex.: Fintech" />
            </Field>
          </div>
        </div>
        <div className="row gap-3 mb-2 flex-wrap">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="Cidade">
              <Input placeholder="Cidade, UF" />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="Tamanho">
              <Input placeholder="Nº de funcionários" />
            </Field>
          </div>
        </div>
        <Field label="Sobre">
          <Textarea rows={3} placeholder="Descreva o negócio e o foco de segurança." />
        </Field>
        <div className="row mt-4" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => showToast("Perfil atualizado")}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPerfil({ user }: { user: User }) {
  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Perfil</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={user.full_name} size="lg" />
          <div className="col">
            <strong style={{ fontWeight: 500 }}>{user.full_name}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {user.email} · Operações
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
