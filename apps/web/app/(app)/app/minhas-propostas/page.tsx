"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Tag } from "@/components/Tag";
import {
  accountFromUser,
  useCloseProposal,
  useProposals,
  usePublishProposal,
  useSession,
  type Proposal,
} from "@/lib/api";
import { formatBRL, relativeTime } from "@/lib/format";
import { useToast } from "@/lib/store";

function statusTone(s: Proposal["status"]) {
  switch (s) {
    case "PUBLISHED":
      return "teal" as const;
    case "DRAFT":
      return "stone" as const;
    case "CONTRACTED":
      return "purple" as const;
    case "CLOSED":
      return "coral" as const;
    default:
      return "stone" as const;
  }
}

function statusLabel(s: Proposal["status"]): string {
  return (
    {
      DRAFT: "Rascunho",
      PUBLISHED: "Publicada",
      CONTRACTED: "Contratada",
      CLOSED: "Encerrada",
      ARCHIVED: "Arquivada",
    } as const
  )[s];
}

export default function MinhasPropostasPage() {
  const router = useRouter();
  const { data: user, isLoading: loadingUser } = useSession();
  const propostas = useProposals({ mine: true });
  const publish = usePublishProposal();
  const close = useCloseProposal();
  const showToast = useToast((s) => s.show);

  if (loadingUser) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }
  const account = accountFromUser(user);
  if (account !== "empresa") {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <p className="muted">Esta tela é exclusiva para empresas.</p>
      </div>
    );
  }

  const list = propostas.data ?? [];

  const onPublish = async (id: string) => {
    try {
      await publish.mutateAsync(id);
      showToast("Proposta publicada");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao publicar.");
    }
  };
  const onClose = async (id: string) => {
    if (!confirm("Encerrar esta proposta? Essa ação não pode ser desfeita.")) return;
    try {
      await close.mutateAsync(id);
      showToast("Proposta encerrada");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao encerrar.");
    }
  };

  return (
    <div className="container-x" style={{ padding: "32px 0 64px" }}>
      <div className="row mb-4" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="h1">Minhas propostas</h1>
          <span className="muted" style={{ fontSize: 13 }}>
            {propostas.isLoading ? "carregando…" : `${list.length} ${list.length === 1 ? "proposta" : "propostas"}`}
          </span>
        </div>
        <button
          className="btn btn-primary btn-sm"
          type="button"
          onClick={() => router.push("/app/propostas/nova")}
        >
          <Plus size={13} /> Publicar proposta
        </button>
      </div>

      {propostas.isError && (
        <div
          className="card"
          style={{ textAlign: "center", padding: 32, color: "var(--danger)" }}
        >
          Falha ao carregar suas propostas.
        </div>
      )}

      {!propostas.isError && list.length === 0 && !propostas.isLoading && (
        <div
          className="card card-pad-lg"
          style={{ textAlign: "center", color: "var(--text-2)", padding: 48 }}
        >
          Você ainda não criou nenhuma proposta.
          <div className="mt-4">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => router.push("/app/propostas/nova")}
            >
              <Plus size={13} /> Criar primeira proposta
            </button>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Status</th>
                <th>Budget</th>
                <th>Publicada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/app/propostas/${p.id}`}
                      style={{ fontWeight: 500 }}
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td>
                    <Tag tone={statusTone(p.status)}>{statusLabel(p.status)}</Tag>
                  </td>
                  <td>{formatBRL(p.budget_amount)}</td>
                  <td className="muted">
                    {p.published_at ? relativeTime(p.published_at) : "—"}
                  </td>
                  <td className="text-right">
                    <span className="row gap-2" style={{ justifyContent: "flex-end" }}>
                      {p.status === "DRAFT" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => onPublish(p.id)}
                          disabled={publish.isPending}
                        >
                          Publicar
                        </button>
                      )}
                      {(p.status === "PUBLISHED" || p.status === "CONTRACTED") && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => onClose(p.id)}
                          disabled={close.isPending}
                        >
                          Encerrar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => router.push(`/app/propostas/${p.id}`)}
                      >
                        Ver
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
