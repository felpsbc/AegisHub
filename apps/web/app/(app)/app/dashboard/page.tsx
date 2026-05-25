"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileText, Plus, Search } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { PropostaCard } from "@/components/PropostaCard";
import { Stat } from "@/components/Stat";
import { StatusDot } from "@/components/StatusDot";
import {
  accountFromUser,
  useMyApplications,
  useProposals,
  useSession,
  type User,
} from "@/lib/api";

export default function DashboardPage() {
  const { data: user, isLoading } = useSession();
  if (isLoading || !user) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }
  const account = accountFromUser(user);
  if (account === "empresa") return <DashEmpresa user={user} />;
  if (account === "pentester") return <DashPentester user={user} />;
  return <DashAdminRedirect />;
}

function DashAdminRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return null;
}

function DashEmpresa({ user }: { user: User }) {
  const router = useRouter();
  const tenant = user.memberships.find((m) => m.tenant.type === "COMPANY")?.tenant;
  const empresaNome = tenant?.legal_name ?? user.full_name;
  const propostas = useProposals({ mine: true });
  const minhas = propostas.data ?? [];
  const publicadas = minhas.filter((p) => p.status === "PUBLISHED").length;
  const contratadas = minhas.filter((p) => p.status === "CONTRACTED").length;

  return (
    <div className="container-x" style={{ padding: "32px 0 64px" }}>
      <h1 className="h1 mb-4">Bem-vindo(a), {empresaNome.split(" ")[0]}</h1>
      <div className="row gap-3 mb-4 flex-wrap">
        <Stat num={contratadas} label="Contratações ativas" style={{ flex: 1, minWidth: 180 }} />
        <Stat num={publicadas} label="Propostas publicadas" style={{ flex: 1, minWidth: 180 }} />
        <Stat num={minhas.length} label="Propostas totais" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="—" label="Em escrow" style={{ flex: 1, minWidth: 180 }} />
      </div>

      <div className="card card-pad-lg mb-4">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <h2 className="h2">Minhas propostas</h2>
          <button
            type="button"
            className="muted"
            style={{ fontSize: 13, cursor: "pointer", border: "none", background: "transparent" }}
            onClick={() => router.push("/app/minhas-propostas")}
          >
            Ver todas →
          </button>
        </div>
        {minhas.length === 0 ? (
          <div className="muted" style={{ fontSize: 13, padding: "16px 0" }}>
            Você ainda não publicou nenhuma proposta.{" "}
            <button
              type="button"
              className="muted"
              style={{ border: "none", background: "transparent", textDecoration: "underline", cursor: "pointer" }}
              onClick={() => router.push("/app/propostas/nova")}
            >
              Crie a primeira
            </button>
            .
          </div>
        ) : (
          <div className="list-propostas">
            {minhas.slice(0, 3).map((pr) => (
              <PropostaCard key={pr.id} pr={pr} showFavorite={false} />
            ))}
          </div>
        )}
      </div>

      <div className="row gap-3 flex-wrap">
        <div className="card card-pad-lg" style={{ flex: 1, minWidth: 280 }}>
          <h2 className="h2 mb-4">Atalhos</h2>
          <div className="col" style={{ gap: 8 }}>
            <button
              className="btn"
              style={{ justifyContent: "flex-start" }}
              type="button"
              onClick={() => router.push("/app/propostas/nova")}
            >
              <Plus size={14} /> Publicar nova proposta
            </button>
            <button
              className="btn"
              style={{ justifyContent: "flex-start" }}
              type="button"
              onClick={() => router.push("/app/pentesters")}
            >
              <Search size={14} /> Buscar pentesters
            </button>
            <button
              className="btn"
              style={{ justifyContent: "flex-start" }}
              type="button"
              onClick={() => router.push("/app/favoritos")}
            >
              <FileText size={14} /> Ver favoritos
            </button>
          </div>
        </div>
        <div className="card card-pad-lg" style={{ flex: 1, minWidth: 280 }}>
          <h2 className="h2 mb-4">Conta</h2>
          <div className="row gap-3">
            <Avatar name={empresaNome} />
            <div className="col">
              <strong style={{ fontWeight: 500 }}>{empresaNome}</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                {user.email}
              </span>
            </div>
          </div>
          {user.email && !user.mfa_enabled && (
            <p className="muted mt-2" style={{ fontSize: 12 }}>
              Dica: ative MFA no perfil para reforçar a segurança da conta.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DashPentester({ user }: { user: User }) {
  const router = useRouter();
  const apps = useMyApplications();
  const propostas = useProposals();
  const ativas = (apps.data ?? []).filter((a) => a.status === "SUBMITTED" || a.status === "SHORTLISTED");
  const aceitas = (apps.data ?? []).filter((a) => a.status === "ACCEPTED");

  return (
    <div className="container-x" style={{ padding: "32px 0 64px" }}>
      <h1 className="h1 mb-4">Olá, {user.full_name.split(" ")[0]}</h1>

      <div className="card card-pad-lg mb-4">
        <div className="row gap-3 flex-wrap">
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Status atual
            </span>
            <StatusDot status="open" />
          </div>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Candidaturas ativas
            </span>
            <span className="rate-value">{ativas.length}</span>
          </div>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Projetos aceitos
            </span>
            <span className="rate-value">{aceitas.length}</span>
          </div>
        </div>
      </div>

      <div className="card card-pad-lg mb-4">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <h2 className="h2">Propostas abertas</h2>
          <button
            type="button"
            className="muted"
            style={{ fontSize: 13, cursor: "pointer", border: "none", background: "transparent" }}
            onClick={() => router.push("/app/propostas")}
          >
            Ver todas →
          </button>
        </div>
        {propostas.isLoading ? (
          <span className="muted" style={{ fontSize: 13 }}>
            Carregando…
          </span>
        ) : (propostas.data ?? []).length === 0 ? (
          <span className="muted" style={{ fontSize: 13 }}>
            Nenhuma proposta aberta no momento.
          </span>
        ) : (
          <div className="list-propostas">
            {(propostas.data ?? []).slice(0, 3).map((pr) => (
              <PropostaCard key={pr.id} pr={pr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
