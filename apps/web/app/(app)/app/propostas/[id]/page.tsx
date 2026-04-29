"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Check, Clock, Users } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Tag } from "@/components/Tag";
import { getProposta, propostas } from "@/lib/mock";
import { useAuth, useToast } from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

export default function PropostaDetailPage({ params }: Props) {
  const { id } = use(params);
  const account = useAuth((s) => s.account);
  const showToast = useToast((s) => s.show);
  const [applied, setApplied] = useState(false);

  const pr = getProposta(id) ?? propostas[0]!;

  return (
    <div className="container-x detail">
      <div>
        <Link
          href="/app/propostas"
          className="btn btn-ghost btn-sm mb-4"
          style={{ display: "inline-flex" }}
        >
          <ArrowLeft size={13} /> Voltar às propostas
        </Link>

        <div className="card card-pad-lg">
          <div className="row gap-3 mb-2 flex-wrap">
            {pr.categorias.map((c) => (
              <Tag key={c.label} tone={c.tone}>
                {c.label}
              </Tag>
            ))}
            <Tag>{pr.tipoTeste}</Tag>
            <Tag>{pr.remoto ? "Remoto" : "Presencial"}</Tag>
          </div>
          <h1 className="h1" style={{ fontSize: 26, lineHeight: 1.2 }}>
            {pr.titulo}
          </h1>
          <div
            className="row gap-3 mt-2 flex-wrap"
            style={{ color: "var(--text-2)", fontSize: 13 }}
          >
            <span className="row" style={{ gap: 6 }}>
              <Avatar name={pr.empresa} color={pr.empresaColor} size="sm" />
              {pr.empresa} · {pr.empresaTipo}
            </span>
            <span>·</span>
            <span className="row" style={{ gap: 4 }}>
              <Clock size={12} /> {pr.publicado}
            </span>
            <span>·</span>
            <span className="row" style={{ gap: 4 }}>
              <Users size={12} /> {pr.candidaturas} candidaturas
            </span>
          </div>
        </div>

        <div className="card card-pad-lg mt-4">
          <h2 className="h2 mb-4">Escopo</h2>
          <p className="body-15">{pr.escopo}</p>

          <h2 className="h2 mt-6 mb-4">Requisitos</h2>
          <ul style={{ paddingLeft: 18, margin: 0 }}>
            {pr.requisitos.map((r) => (
              <li key={r} style={{ padding: "4px 0" }}>
                {r}
              </li>
            ))}
          </ul>

          <h2 className="h2 mt-6 mb-4">Como será o trabalho</h2>
          <ol style={{ paddingLeft: 18, margin: 0, color: "var(--text)" }}>
            <li style={{ padding: "4px 0" }}>
              Kick-off por vídeo + assinatura de NDA padrão da AegisHub.
            </li>
            <li style={{ padding: "4px 0" }}>
              Acesso liberado a ambiente de homologação.
            </li>
            <li style={{ padding: "4px 0" }}>
              Daily curto opcional + relatório executivo + relatório técnico.
            </li>
            <li style={{ padding: "4px 0" }}>Reteste incluso após correções.</li>
          </ol>
        </div>
      </div>

      <aside className="detail-aside">
        <div className="card">
          <div className="col" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Budget
            </span>
            <span className="rate-value">R$ {pr.budget.toLocaleString("pt-BR")}</span>
            <span className="muted" style={{ fontSize: 13 }}>
              Prazo: {pr.prazo}
            </span>
          </div>
          <hr className="hr" />
          {account === "pentester" ? (
            <button
              className={`btn btn-block ${applied ? "" : "btn-primary"}`}
              disabled={applied}
              type="button"
              onClick={() => {
                setApplied(true);
                showToast("Candidatura enviada");
              }}
            >
              {applied ? (
                <>
                  <Check size={14} /> Candidatura enviada
                </>
              ) : (
                "Candidatar-se"
              )}
            </button>
          ) : (
            <button className="btn btn-primary btn-block" type="button">
              Editar proposta
            </button>
          )}
          <button className="btn btn-block mt-2" type="button">
            Salvar
          </button>
        </div>

        <div className="card">
          <h3
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: "var(--text-2)",
              margin: 0,
              marginBottom: 12,
            }}
          >
            Empresa
          </h3>
          <div className="row gap-2 mb-2">
            <Avatar name={pr.empresa} color={pr.empresaColor} />
            <div className="col">
              <span style={{ fontWeight: 500 }}>{pr.empresa}</span>
              <span className="muted" style={{ fontSize: 12 }}>
                {pr.empresaTipo}
              </span>
            </div>
          </div>
          <div className="col" style={{ gap: 8, marginTop: 8 }}>
            {[
              { label: "Avaliação", val: "★ 4.9" },
              { label: "Projetos publicados", val: "14" },
              { label: "Tempo médio de resposta", val: "6h" },
            ].map((s) => (
              <div
                key={s.label}
                className="row"
                style={{ justifyContent: "space-between", fontSize: 13 }}
              >
                <span className="muted">{s.label}</span>
                <span>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
