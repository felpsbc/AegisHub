"use client";

import { useState } from "react";
import { FileText, TrendingUp, Users } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { Badge } from "@/components/Badge";
import { Stat } from "@/components/Stat";
import {
  ApiError,
  useAdminProposals,
  useAdminStats,
  useAdminUsers,
  useDeleteProposal,
  useSession,
  useSetUserActive,
  type AdminProposal,
  type AdminUser,
} from "@/lib/api";

type Tab = "visao" | "usuarios" | "propostas";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("visao");

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
          className={tab === "usuarios" ? "active" : ""}
          onClick={() => setTab("usuarios")}
          type="button"
        >
          <Users size={13} /> Usuários
        </button>
        <button
          className={tab === "propostas" ? "active" : ""}
          onClick={() => setTab("propostas")}
          type="button"
        >
          <FileText size={13} /> Propostas
        </button>
      </aside>

      <div>
        {tab === "visao" && <Visao />}
        {tab === "usuarios" && <Usuarios />}
        {tab === "propostas" && <Propostas />}
      </div>
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  const msg = error instanceof ApiError ? error.message : "Falha ao carregar.";
  return (
    <div className="card card-pad-lg" style={{ color: "var(--danger)" }} role="alert">
      {msg}
    </div>
  );
}

function Visao() {
  const { data, isLoading, isError, error } = useAdminStats();
  return (
    <>
      <h1 className="h1 mb-4">Visão geral</h1>
      {isError ? (
        <ErrorBox error={error} />
      ) : (
        <div className="row gap-3 mb-4 flex-wrap">
          <Stat
            num={isLoading ? "…" : data!.users_active}
            label="Usuários ativos"
            style={{ flex: 1, minWidth: 160 }}
          />
          <Stat
            num={isLoading ? "…" : data!.companies}
            label="Empresas"
            style={{ flex: 1, minWidth: 160 }}
          />
          <Stat
            num={isLoading ? "…" : data!.pentesters}
            label="Pentesters"
            style={{ flex: 1, minWidth: 160 }}
          />
          <Stat
            num={isLoading ? "…" : data!.proposals_published}
            label="Propostas publicadas"
            style={{ flex: 1, minWidth: 160 }}
          />
          <Stat
            num={isLoading ? "…" : data!.applications_total}
            label="Candidaturas"
            style={{ flex: 1, minWidth: 160 }}
          />
        </div>
      )}
    </>
  );
}

function Usuarios() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError, error } = useAdminUsers(q || undefined);
  const setActive = useSetUserActive();
  const { data: me } = useSession();

  return (
    <>
      <h1 className="h1 mb-4">Usuários</h1>
      <input
        className="input mb-4"
        placeholder="Buscar por nome ou e-mail…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 360 }}
      />
      {isError ? (
        <ErrorBox error={error} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Papel</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((u: AdminUser) => {
                const isSelf = me?.email === u.email;
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="row gap-2">
                        <Avatar name={u.full_name || u.email} size="sm" />
                        <span>
                          <div>{u.full_name || "—"}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {u.email}
                          </div>
                        </span>
                      </span>
                    </td>
                    <td>
                      <Badge>{u.role}</Badge>
                    </td>
                    <td>
                      {u.is_active ? (
                        <span style={{ color: "var(--success, #16a34a)" }}>Ativo</span>
                      ) : (
                        <span className="muted">Desativado</span>
                      )}
                    </td>
                    <td className="text-right">
                      <button
                        className="btn btn-sm"
                        type="button"
                        disabled={isSelf || u.is_admin || setActive.isPending}
                        title={
                          isSelf
                            ? "Você não pode alterar sua própria conta"
                            : u.is_admin
                              ? "Use o Django admin para alterar outros admins"
                              : undefined
                        }
                        onClick={() =>
                          setActive.mutate({ id: u.id, active: !u.is_active })
                        }
                      >
                        {u.is_active ? "Desativar" : "Reativar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && (data ?? []).length === 0 && (
                <EmptyRow span={4} text="Nenhum usuário encontrado." />
              )}
              {isLoading && <EmptyRow span={4} text="Carregando…" />}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Propostas() {
  const [q, setQ] = useState("");
  const { data, isLoading, isError, error } = useAdminProposals(q || undefined);
  const del = useDeleteProposal();

  const onDelete = (p: AdminProposal) => {
    const extra =
      p.applications_count > 0
        ? ` e ${p.applications_count} candidatura(s) vinculada(s)`
        : "";
    if (
      window.confirm(
        `Excluir a proposta "${p.title}"${extra}? Esta ação não pode ser desfeita.`,
      )
    ) {
      del.mutate(p.id);
    }
  };

  return (
    <>
      <h1 className="h1 mb-4">Propostas</h1>
      <input
        className="input mb-4"
        placeholder="Buscar por título ou empresa…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ maxWidth: 360 }}
      />
      {isError ? (
        <ErrorBox error={error} />
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Empresa</th>
                <th>Status</th>
                <th>Candidaturas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((p: AdminProposal) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td className="muted">{p.company}</td>
                  <td>
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="muted">{p.applications_count}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-sm"
                      type="button"
                      disabled={del.isPending}
                      style={{ color: "var(--danger)" }}
                      onClick={() => onDelete(p)}
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && (data ?? []).length === 0 && (
                <EmptyRow span={5} text="Nenhuma proposta encontrada." />
              )}
              {isLoading && <EmptyRow span={5} text="Carregando…" />}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function EmptyRow({ span, text }: { span: number; text: string }) {
  return (
    <tr>
      <td
        colSpan={span}
        style={{ padding: 32, textAlign: "center", color: "var(--text-2)" }}
      >
        {text}
      </td>
    </tr>
  );
}
