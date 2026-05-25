"use client";

import { useState } from "react";
import {
  CheckCircle2,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Stat } from "@/components/Stat";

type Tab = "visao" | "verificacoes" | "usuarios" | "comissoes" | "moderacao";

type VerifRow = {
  id: string;
  user: string;
  cert: string;
  enviado: string;
  arquivo: string;
};

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("verificacoes");
  // Backend de verificação manual de certificações ainda não existe.
  // Lista vazia até o endpoint /api/v1/admin/certifications/pending entrar.
  const [verifs, setVerifs] = useState<VerifRow[]>([]);

  const decide = (id: string) => setVerifs((v) => v.filter((x) => x.id !== id));

  return (
    <div className="container-x admin">
      <aside className="admin-nav">
        <span className="nav-eyebrow">Painel</span>
        <button
          className={tab === "visao" ? "active" : ""}
          onClick={() => setTab("visao")}
          type="button"
        >
          <TrendingUp size={13} /> Visão geral
        </button>
        <button
          className={tab === "verificacoes" ? "active" : ""}
          onClick={() => setTab("verificacoes")}
          type="button"
        >
          <CheckCircle2 size={13} /> Verificações
          {verifs.length > 0 && (
            <span
              style={{
                marginLeft: "auto",
                background: "var(--accent)",
                color: "var(--accent-fg)",
                borderRadius: 999,
                padding: "0 6px",
                fontSize: 10,
                lineHeight: "16px",
              }}
            >
              {verifs.length}
            </span>
          )}
        </button>
        <button
          className={tab === "usuarios" ? "active" : ""}
          onClick={() => setTab("usuarios")}
          type="button"
        >
          <Users size={13} /> Usuários
        </button>
        <button
          className={tab === "comissoes" ? "active" : ""}
          onClick={() => setTab("comissoes")}
          type="button"
        >
          <DollarSign size={13} /> Comissões
        </button>
        <button
          className={tab === "moderacao" ? "active" : ""}
          onClick={() => setTab("moderacao")}
          type="button"
        >
          <FileText size={13} /> Moderação
        </button>
      </aside>

      <div>
        {tab === "visao" && <Visao />}
        {tab === "verificacoes" && (
          <Verificacoes verifs={verifs} onDecide={decide} />
        )}
        {tab === "usuarios" && <Usuarios />}
        {tab === "comissoes" && <Comissoes />}
        {tab === "moderacao" && <Moderacao />}
      </div>
    </div>
  );
}

function Visao() {
  return (
    <>
      <h1 className="h1 mb-4">Visão geral</h1>
      <div className="row gap-3 mb-4 flex-wrap">
        <Stat num="—" label="Pentesters verificados" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="—" label="Empresas ativas" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="—" label="Projetos em andamento" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="—" label="Comissão (mês)" style={{ flex: 1, minWidth: 180 }} />
      </div>

      <div className="card card-pad-lg mb-4" style={{ textAlign: "center", color: "var(--text-2)" }}>
        Métricas agregadas serão exibidas após o pipeline de telemetria entrar.
      </div>
    </>
  );
}

function Verificacoes({
  verifs,
  onDecide,
}: {
  verifs: VerifRow[];
  onDecide: (id: string) => void;
}) {
  return (
    <>
      <h1 className="h1 mb-4">Verificações pendentes</h1>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Pentester</th>
              <th>Certificação</th>
              <th>Enviado</th>
              <th>Arquivo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {verifs.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className="row gap-2">
                    <Avatar name={v.user} size="sm" />
                    {v.user}
                  </span>
                </td>
                <td>
                  <Badge>{v.cert}</Badge>
                </td>
                <td className="muted">{v.enviado}</td>
                <td className="muted">{v.arquivo}</td>
                <td className="text-right">
                  <span className="row gap-2" style={{ justifyContent: "flex-end" }}>
                    <button
                      className="btn btn-sm"
                      type="button"
                      onClick={() => onDecide(v.id)}
                    >
                      Rejeitar
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      type="button"
                      onClick={() => onDecide(v.id)}
                    >
                      Aprovar
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {verifs.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: "var(--text-2)",
                  }}
                >
                  Sem pendências. Boa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Usuarios() {
  return (
    <>
      <h1 className="h1 mb-4">Usuários</h1>
      <div
        className="card card-pad-lg"
        style={{ textAlign: "center", color: "var(--text-2)", padding: 48 }}
      >
        Listagem de usuários virá com o painel admin dedicado (próxima entrega).
      </div>
    </>
  );
}

function Comissoes() {
  return (
    <>
      <h1 className="h1 mb-4">Comissões</h1>
      <div
        className="card card-pad-lg"
        style={{ textAlign: "center", color: "var(--text-2)", padding: 48 }}
      >
        Relatório de comissões será exibido quando o módulo de pagamentos
        (Fase 2) entrar em produção.
      </div>
    </>
  );
}

function Moderacao() {
  return (
    <>
      <h1 className="h1 mb-4">Moderação</h1>
      <div
        className="card card-pad-lg"
        style={{ textAlign: "center", color: "var(--text-2)", padding: 64 }}
      >
        Sem reportes abertos no momento.
      </div>
    </>
  );
}
