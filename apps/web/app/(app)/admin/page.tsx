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
import { Verified } from "@/components/Verified";
import { pentesters, verificacoes as initialVerifs } from "@/lib/mock";

type Tab = "visao" | "verificacoes" | "usuarios" | "comissoes" | "moderacao";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("verificacoes");
  const [verifs, setVerifs] = useState(initialVerifs);

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
        <Stat num="312" label="Pentesters verificados" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="128" label="Empresas ativas" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="47" label="Projetos em andamento" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="R$ 184k" label="Comissão (mês)" style={{ flex: 1, minWidth: 180 }} />
      </div>

      <div className="card card-pad-lg mb-4">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <h2 className="h2">Receita por mês — últimos 12</h2>
          <span className="muted" style={{ fontSize: 12 }}>
            Comissão de 8% sobre GMV
          </span>
        </div>
        <div className="bars">
          {[42, 56, 51, 68, 72, 89, 95, 112, 128, 141, 167, 184].map((v, i, arr) => (
            <div
              key={i}
              className={`bar ${i === arr.length - 1 ? "accent" : ""}`}
              style={{ height: `${(v / 184) * 100}%` }}
              title={`R$ ${v}k`}
            />
          ))}
        </div>
        <div
          className="row mt-2"
          style={{
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--text-3)",
          }}
        >
          <span>mai/25</span>
          <span>nov/25</span>
          <span>abr/26</span>
        </div>
      </div>
    </>
  );
}

function Verificacoes({
  verifs,
  onDecide,
}: {
  verifs: typeof initialVerifs;
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
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Verificado</th>
              <th>Projetos</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {pentesters.slice(0, 8).map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="row gap-2">
                    <Avatar name={p.nome} color={p.color} size="sm" />
                    {p.nome}
                  </span>
                </td>
                <td className="muted">Pentester</td>
                <td>
                  {p.verificado ? (
                    <span className="row gap-2">
                      <Verified /> sim
                    </span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{p.projetos}</td>
                <td>{p.rating.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Comissoes() {
  const rows: [string, string, string, number][] = [
    ["Pentest open finance", "Banco Lumen", "Mariana Albuquerque", 38000],
    ["Mobile delivery", "Sabor Express", "Beatriz Camargo", 22000],
    ["Red team interno", "Construtora Itacira", "Letícia Vasconcelos", 62000],
    ["Cloud AWS", "Cíclica Saúde", "João Henrique Souza", 28000],
    ["Phishing dirigido", "Granito Capital", "Tainá Moraes", 18000],
  ];
  return (
    <>
      <h1 className="h1 mb-4">Comissões</h1>
      <div className="row gap-3 mb-4 flex-wrap">
        <Stat
          num="R$ 184.320"
          label="Comissão acumulada (mês)"
          style={{ flex: 1, minWidth: 180 }}
        />
        <Stat num="8,0%" label="Taxa atual" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="R$ 2,3M" label="GMV (mês)" style={{ flex: 1, minWidth: 180 }} />
      </div>
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Projeto</th>
              <th>Empresa</th>
              <th>Pentester</th>
              <th>Valor</th>
              <th>Comissão</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([t, e, p, v]) => (
              <tr key={t}>
                <td>{t}</td>
                <td className="muted">{e}</td>
                <td className="muted">{p}</td>
                <td>R$ {v.toLocaleString("pt-BR")}</td>
                <td>
                  <strong style={{ fontWeight: 500 }}>
                    R${" "}
                    {(v * 0.08).toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
