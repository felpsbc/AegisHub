"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import {
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
  type Proposal,
} from "@/lib/api";
import { formatBRL, hashColor, relativeTime } from "@/lib/format";
import { useToast } from "@/lib/store";

import { Tag } from "./Tag";

export function PropostaCard({
  pr,
  showFavorite = true,
}: {
  pr: Proposal;
  showFavorite?: boolean;
}) {
  const router = useRouter();
  const fav = useFavorites("proposal");
  const add = useAddFavorite();
  const remove = useRemoveFavorite();
  const showToast = useToast((s) => s.show);

  const favorited = fav.data?.find((f) => f.target_id === pr.id);

  const go = () => router.push(`/app/propostas/${pr.id}`);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };

  const toggleFav = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="prcard" onClick={go} onKeyDown={onKey} role="button" tabIndex={0}>
      <div>
        <div className="prcard-title">{pr.title}</div>
        <div className="prcard-meta">
          <span>{pr.company}</span>
          <span className="sep">·</span>
          <span>{relativeTime(pr.published_at ?? pr.created_at)}</span>
        </div>
      </div>
      <div className="prcard-side">
        <div className="prcard-budget">{formatBRL(pr.budget_amount)}</div>
        <div className="prcard-prazo">
          {pr.duration_weeks ? `${pr.duration_weeks} sem.` : "—"} ·{" "}
          {pr.budget_kind.toLowerCase()}
        </div>
      </div>
      <div className="prcard-tags">
        {pr.specialties.slice(0, 4).map((s) => (
          <Tag key={s.code} tone={hashColor(s.label)}>
            {s.label}
          </Tag>
        ))}
        {showFavorite && (
          <button
            type="button"
            className="icon-btn"
            onClick={toggleFav}
            aria-label={favorited ? "Remover dos favoritos" : "Favoritar"}
            title={favorited ? "Remover dos favoritos" : "Favoritar"}
            disabled={add.isPending || remove.isPending}
            style={{ marginLeft: "auto", color: favorited ? "var(--danger)" : "var(--text-2)" }}
          >
            <Heart size={14} fill={favorited ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    </div>
  );
}
