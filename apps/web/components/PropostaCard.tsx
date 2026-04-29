"use client";

import { useRouter } from "next/navigation";

import type { Proposta } from "@/lib/mock";

import { Tag } from "./Tag";

export function PropostaCard({ pr }: { pr: Proposta }) {
  const router = useRouter();
  const go = () => router.push(`/app/propostas/${pr.id}`);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };
  return (
    <div
      className="prcard"
      onClick={go}
      onKeyDown={onKey}
      role="button"
      tabIndex={0}
    >
      <div>
        <div className="prcard-title">{pr.titulo}</div>
        <div className="prcard-meta">
          <span>{pr.empresa}</span>
          <span className="sep">·</span>
          <span>{pr.empresaTipo}</span>
          <span className="sep">·</span>
          <span>{pr.publicado}</span>
        </div>
      </div>
      <div className="prcard-side">
        <div className="prcard-budget">R$ {pr.budget.toLocaleString("pt-BR")}</div>
        <div className="prcard-prazo">
          {pr.prazo} · {pr.tipoTeste}
        </div>
      </div>
      <div className="prcard-tags">
        {pr.categorias.map((c) => (
          <Tag key={c.label} tone={c.tone}>
            {c.label}
          </Tag>
        ))}
        <Tag>{pr.candidaturas} candidaturas</Tag>
      </div>
    </div>
  );
}
