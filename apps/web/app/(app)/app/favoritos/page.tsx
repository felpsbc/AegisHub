"use client";

import Link from "next/link";
import { useState } from "react";
import { Heart, Trash2 } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Modal } from "@/components/Modal";
import { Tag } from "@/components/Tag";
import {
  accountFromUser,
  useFavorites,
  useRemoveFavorite,
  useSession,
  type Favorite,
  type FavoritePentesterTarget,
  type FavoriteProposalTarget,
} from "@/lib/api";
import { formatBRL, hashColor, relativeTime } from "@/lib/format";
import { useToast } from "@/lib/store";

type Confirmation = { id: string; label: string } | null;

export default function FavoritosPage() {
  const { data: user, isLoading } = useSession();
  const account = accountFromUser(user);

  if (isLoading) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }

  // Empresas favoritam pentesters; pentesters favoritam propostas.
  const type = account === "empresa" ? "pentester" : "proposal";
  return <FavoritosList type={type} />;
}

function FavoritosList({ type }: { type: "pentester" | "proposal" }) {
  const favs = useFavorites(type);
  const remove = useRemoveFavorite();
  const showToast = useToast((s) => s.show);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const list = favs.data ?? [];

  const handleRemove = async () => {
    if (!confirmation) return;
    try {
      await remove.mutateAsync(confirmation.id);
      showToast("Removido dos favoritos");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao remover.");
    } finally {
      setConfirmation(null);
    }
  };

  const title = type === "pentester" ? "Pentesters favoritos" : "Propostas favoritas";
  const emptyMsg =
    type === "pentester"
      ? "Você ainda não favoritou nenhum pentester."
      : "Você ainda não favoritou nenhuma proposta.";
  const browseHref = type === "pentester" ? "/app/pentesters" : "/app/propostas";
  const browseLabel = type === "pentester" ? "Buscar pentesters" : "Ver propostas abertas";

  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 920 }}>
      <div className="row mb-4" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">
            <Heart
              size={20}
              fill="currentColor"
              style={{
                color: "var(--danger)",
                display: "inline-block",
                marginRight: 8,
                verticalAlign: "middle",
              }}
            />
            {title}
          </h1>
          <span className="muted" style={{ fontSize: 13 }}>
            {favs.isLoading ? "carregando…" : `${list.length} ${list.length === 1 ? "item" : "itens"}`}
          </span>
        </div>
      </div>

      {favs.isError && (
        <div
          className="card"
          style={{ textAlign: "center", padding: 32, color: "var(--danger)" }}
        >
          Falha ao carregar favoritos.
        </div>
      )}

      {!favs.isError && list.length === 0 && !favs.isLoading && (
        <div
          className="card card-pad-lg"
          style={{ textAlign: "center", color: "var(--text-2)", padding: 48 }}
        >
          {emptyMsg}
          <div className="mt-4">
            <Link href={browseHref} className="btn btn-primary">
              {browseLabel}
            </Link>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className="col" style={{ gap: 10 }}>
          {list.map((f) =>
            f.target_type === "pentester" ? (
              <PentesterFavCard
                key={f.id}
                fav={f}
                onAskRemove={(label) => setConfirmation({ id: f.id, label })}
              />
            ) : (
              <PropostaFavCard
                key={f.id}
                fav={f}
                onAskRemove={(label) => setConfirmation({ id: f.id, label })}
              />
            ),
          )}
        </div>
      )}

      <Modal open={!!confirmation} onClose={() => setConfirmation(null)}>
        <h2 className="h2 mb-2">Remover dos favoritos?</h2>
        <p className="muted mb-4" style={{ fontSize: 14 }}>
          {confirmation?.label
            ? `“${confirmation.label}” será removido da sua lista. Você pode adicionar de novo a qualquer momento.`
            : "O item será removido da sua lista. Você pode adicionar de novo a qualquer momento."}
        </p>
        <div className="row gap-2" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn"
            type="button"
            onClick={() => setConfirmation(null)}
            disabled={remove.isPending}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={handleRemove}
            disabled={remove.isPending}
            style={{ background: "var(--danger)", color: "white" }}
          >
            {remove.isPending ? "Removendo…" : "Sim, remover"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function PentesterFavCard({
  fav,
  onAskRemove,
}: {
  fav: Favorite;
  onAskRemove: (label: string) => void;
}) {
  const t = fav.target as FavoritePentesterTarget | null;
  if (!t) {
    return <StaleCard onAskRemove={() => onAskRemove("este pentester")} label="Pentester removido" />;
  }
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row gap-3" style={{ alignItems: "flex-start" }}>
        <Avatar name={t.legal_name} color={hashColor(t.legal_name)} />
        <div className="col" style={{ flex: 1, gap: 4 }}>
          <Link
            href={`/app/pentesters/${fav.target_id}`}
            style={{ fontWeight: 500 }}
          >
            {t.legal_name}
          </Link>
          <span className="muted" style={{ fontSize: 13 }}>
            {t.headline || "—"}
          </span>
          {t.specialties.length > 0 && (
            <div className="row gap-2 mt-2 flex-wrap">
              {t.specialties.slice(0, 4).map((s) => (
                <Tag key={s} tone={hashColor(s)}>
                  {s}
                </Tag>
              ))}
            </div>
          )}
        </div>
        <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
          <span className="rate-value">{formatBRL(t.hourly_rate)}</span>
          <span className="rate-unit">/h</span>
        </div>
      </div>
      <div
        className="row mt-4"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <span className="muted" style={{ fontSize: 12 }}>
          Salvo em {relativeTime(fav.created_at)}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onAskRemove(t.legal_name)}
          style={{ color: "var(--danger)" }}
        >
          <Trash2 size={13} /> Remover dos favoritos
        </button>
      </div>
    </div>
  );
}

function PropostaFavCard({
  fav,
  onAskRemove,
}: {
  fav: Favorite;
  onAskRemove: (label: string) => void;
}) {
  const t = fav.target as FavoriteProposalTarget | null;
  if (!t) {
    return <StaleCard onAskRemove={() => onAskRemove("esta proposta")} label="Proposta removida" />;
  }
  return (
    <div className="card" style={{ padding: 16 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <Link
            href={`/app/propostas/${fav.target_id}`}
            style={{ fontWeight: 500, fontSize: 15 }}
          >
            {t.title}
          </Link>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            {t.company} · {t.status}
          </div>
        </div>
        <div className="col" style={{ alignItems: "flex-end", gap: 4 }}>
          <span className="rate-value" style={{ fontSize: 18 }}>
            {formatBRL(t.budget_amount)}
          </span>
          <span className="rate-unit">
            {t.duration_weeks ? `${t.duration_weeks} sem.` : "—"}
          </span>
        </div>
      </div>
      {t.specialties.length > 0 && (
        <div className="row gap-2 mt-2 flex-wrap">
          {t.specialties.slice(0, 4).map((s) => (
            <Tag key={s} tone={hashColor(s)}>
              {s}
            </Tag>
          ))}
        </div>
      )}
      <div
        className="row mt-4"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <span className="muted" style={{ fontSize: 12 }}>
          Salvo em {relativeTime(fav.created_at)}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onAskRemove(t.title)}
          style={{ color: "var(--danger)" }}
        >
          <Trash2 size={13} /> Remover dos favoritos
        </button>
      </div>
    </div>
  );
}

function StaleCard({
  label,
  onAskRemove,
}: {
  label: string;
  onAskRemove: () => void;
}) {
  return (
    <div
      className="card"
      style={{ padding: 16, display: "flex", justifyContent: "space-between" }}
    >
      <span className="muted">{label} (não está mais disponível)</span>
      <button
        type="button"
        className="btn btn-sm"
        onClick={onAskRemove}
        style={{ color: "var(--danger)" }}
      >
        <Trash2 size={13} /> Remover
      </button>
    </div>
  );
}
