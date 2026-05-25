"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ArrowLeft, Check, Heart } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Field, Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Tag } from "@/components/Tag";
import {
  accountFromUser,
  useAddFavorite,
  useCreateApplication,
  useFavorites,
  useProposal,
  useRemoveFavorite,
  useSession,
} from "@/lib/api";
import { formatBRL, hashColor, relativeTime } from "@/lib/format";
import { useToast } from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

export default function PropostaDetailPage({ params }: Props) {
  const { id } = use(params);
  const { data: user } = useSession();
  const account = accountFromUser(user);
  const { data: pr, isLoading, isError } = useProposal(id);
  const showToast = useToast((s) => s.show);
  const apply = useCreateApplication();
  const fav = useFavorites("proposal");
  const add = useAddFavorite();
  const remove = useRemoveFavorite();
  const [applied, setApplied] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [cover, setCover] = useState("");

  if (isLoading) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }
  if (isError || !pr) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <Link href="/app/propostas" className="btn btn-sm">
          <ArrowLeft size={13} /> Voltar
        </Link>
        <p className="mt-4 muted">Proposta não encontrada ou sem acesso.</p>
      </div>
    );
  }

  const favorited = fav.data?.find((f) => f.target_id === pr.id);
  const toggleFav = async () => {
    try {
      if (favorited) {
        await remove.mutateAsync(favorited.id);
        showToast("Removida dos favoritos");
      } else {
        await add.mutateAsync({ target_type: "proposal", target_id: pr.id });
        showToast("Adicionada aos favoritos");
      }
    } catch {
      showToast("Não foi possível atualizar favoritos");
    }
  };

  const submitApply = async () => {
    try {
      await apply.mutateAsync({ proposalId: pr.id, cover_message: cover });
      setApplied(true);
      setShowApply(false);
      showToast("Candidatura enviada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar candidatura.";
      showToast(msg);
    }
  };

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
            {pr.specialties.map((s) => (
              <Tag key={s.code} tone={hashColor(s.label)}>
                {s.label}
              </Tag>
            ))}
            <Tag>{pr.budget_kind}</Tag>
          </div>
          <h1 className="h1" style={{ fontSize: 26, lineHeight: 1.2 }}>
            {pr.title}
          </h1>
          <div
            className="row gap-3 mt-2 flex-wrap"
            style={{ color: "var(--text-2)", fontSize: 13 }}
          >
            <span className="row" style={{ gap: 6 }}>
              <Avatar name={pr.company} size="sm" />
              {pr.company}
            </span>
            <span>·</span>
            <span>{relativeTime(pr.published_at ?? pr.created_at)}</span>
            <span>·</span>
            <span>{pr.status}</span>
          </div>
        </div>

        <div className="card card-pad-lg mt-4">
          <h2 className="h2 mb-4">Descrição</h2>
          <p className="body-15" style={{ whiteSpace: "pre-wrap" }}>
            {pr.description}
          </p>

          <h2 className="h2 mt-6 mb-4">Escopo</h2>
          <p className="body-15" style={{ whiteSpace: "pre-wrap" }}>
            {pr.scope_md}
          </p>
        </div>

        {pr.company_profile &&
          (pr.company_profile.about ||
            pr.company_profile.summary ||
            pr.company_profile.industry ||
            pr.company_profile.website) && (
            <div className="card card-pad-lg mt-4">
              <h2 className="h2 mb-2">Sobre a empresa</h2>
              {pr.company_profile.summary && (
                <p className="muted mb-4" style={{ fontSize: 14 }}>
                  {pr.company_profile.summary}
                </p>
              )}
              <div className="row gap-3 mb-4 flex-wrap" style={{ fontSize: 13 }}>
                {pr.company_profile.industry && (
                  <Tag>{pr.company_profile.industry}</Tag>
                )}
                {pr.company_profile.location && (
                  <Tag>{pr.company_profile.location}</Tag>
                )}
                {pr.company_profile.size && <Tag>{pr.company_profile.size}</Tag>}
                {pr.company_profile.founded_year && (
                  <Tag>Desde {pr.company_profile.founded_year}</Tag>
                )}
              </div>
              {pr.company_profile.about && (
                <p className="body-15" style={{ whiteSpace: "pre-wrap" }}>
                  {pr.company_profile.about}
                </p>
              )}
              {pr.company_profile.website && (
                <p className="mt-4" style={{ fontSize: 13 }}>
                  <a
                    href={pr.company_profile.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    style={{ color: "var(--accent, var(--text))" }}
                  >
                    {pr.company_profile.website}
                  </a>
                </p>
              )}
            </div>
          )}
      </div>

      <aside className="detail-aside">
        <div className="card">
          <div className="col" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Budget
            </span>
            <span className="rate-value">{formatBRL(pr.budget_amount)}</span>
            <span className="muted" style={{ fontSize: 13 }}>
              {pr.duration_weeks ? `Prazo: ${pr.duration_weeks} semanas` : "Prazo: a combinar"}
            </span>
          </div>
          <hr className="hr" />
          {account === "pentester" ? (
            <button
              className={`btn btn-block ${applied ? "" : "btn-primary"}`}
              disabled={applied || apply.isPending}
              type="button"
              onClick={() => setShowApply(true)}
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
          <button
            className="btn btn-block mt-2"
            type="button"
            onClick={toggleFav}
            disabled={add.isPending || remove.isPending}
          >
            <Heart
              size={13}
              fill={favorited ? "currentColor" : "none"}
              style={{ color: favorited ? "var(--danger)" : undefined }}
            />
            {favorited ? " Remover dos favoritos" : " Salvar nos favoritos"}
          </button>
        </div>
      </aside>

      <Modal open={showApply} onClose={() => setShowApply(false)}>
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <h2 className="h2">Candidatar-se à proposta</h2>
        </div>
        <Field
          label="Carta de apresentação"
          hint="Por que você é um bom encaixe? Mínimo 20 caracteres."
        >
          <Textarea
            rows={6}
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="Resumo da sua abordagem, experiência relevante e disponibilidade."
          />
        </Field>
        <div className="row gap-2 mt-4" style={{ justifyContent: "flex-end" }}>
          <button className="btn" type="button" onClick={() => setShowApply(false)}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={submitApply}
            disabled={apply.isPending || cover.trim().length < 20}
          >
            {apply.isPending ? "Enviando…" : "Enviar candidatura"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
