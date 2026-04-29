"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Field, Input, Textarea } from "@/components/Field";
import { Pill } from "@/components/Pill";
import { Verified } from "@/components/Verified";
import { adminUser, empresaUser, pentesterUser } from "@/lib/mock";
import { useAuth, useToast } from "@/lib/store";

export default function PerfilPage() {
  const account = useAuth((s) => s.account);

  if (account === "pentester") return <PentesterPerfil />;
  if (account === "empresa") return <EmpresaPerfil />;
  return <AdminPerfil />;
}

function PentesterPerfil() {
  const p = pentesterUser;
  const showToast = useToast((s) => s.show);
  const [rate, setRate] = useState(p.rate);
  const [status, setStatus] = useState(p.status);

  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Seu perfil</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={p.nome} color={p.color} size="lg" />
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <div className="row gap-2">
              <strong style={{ fontWeight: 500 }}>{p.nome}</strong>
              <Verified />
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {p.handle}
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
          <Textarea rows={3} defaultValue={p.bio} />
        </Field>

        <div className="row gap-3 mt-4">
          <div style={{ flex: 1 }}>
            <Field label="Cidade">
              <Input defaultValue={p.cidade} />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Idiomas">
              <Input defaultValue={p.idiomas.join(", ")} />
            </Field>
          </div>
        </div>

        <div className="mt-4">
          <span className="label">Especialidades</span>
          <div className="chips">
            {p.especialidades.map((e) => (
              <span
                key={e}
                className="pill pill-active"
                style={{ cursor: "default" }}
              >
                {e} <X size={11} />
              </span>
            ))}
            <Pill>
              <Plus size={11} /> adicionar
            </Pill>
          </div>
        </div>

        <div className="mt-4">
          <span className="label">Certificações</span>
          <div className="chips">
            {p.certs.map((c) => (
              <span
                key={c}
                className="row gap-2"
                style={{
                  padding: "6px 10px",
                  border: "0.5px solid var(--border)",
                  borderRadius: 999,
                  fontSize: 13,
                }}
              >
                <Verified title="Verificada" />
                {c}
              </span>
            ))}
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

function EmpresaPerfil() {
  const e = empresaUser;
  const showToast = useToast((s) => s.show);
  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Perfil da empresa</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={e.nome} color={e.color} size="lg" />
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <strong style={{ fontWeight: 500 }}>{e.nome}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {e.setor} · {e.tamanho}
            </span>
          </div>
        </div>
        <hr className="hr" />
        <div className="row gap-3 mb-2 flex-wrap">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="CNPJ">
              <Input defaultValue={e.cnpj} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="Setor">
              <Input defaultValue={e.setor} />
            </Field>
          </div>
        </div>
        <div className="row gap-3 mb-2 flex-wrap">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="Cidade">
              <Input defaultValue={e.cidade} />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Field label="Tamanho">
              <Input defaultValue={e.tamanho} />
            </Field>
          </div>
        </div>
        <Field label="Sobre">
          <Textarea
            rows={3}
            defaultValue="Banco digital com foco em open finance e PIX. Equipe de segurança interna pequena, contratamos pentests trimestrais."
          />
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

function AdminPerfil() {
  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Perfil</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={adminUser.nome} color={adminUser.color} size="lg" />
          <div className="col">
            <strong style={{ fontWeight: 500 }}>{adminUser.nome}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              admin@aegishub.com.br
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
