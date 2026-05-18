"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileText, Plus, Search } from "lucide-react";

import { Avatar } from "@/components/Avatar";
import { PropostaCard } from "@/components/PropostaCard";
import { Stat } from "@/components/Stat";
import { StatusDot } from "@/components/StatusDot";
import { Verified } from "@/components/Verified";
import { accountFromUser, useSession, type User } from "@/lib/api";
import { pentesters, propostas } from "@/lib/mock";

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
  const candidatos = pentesters.slice(0, 4);
  return (
    <div className="container-x" style={{ padding: "32px 0 64px" }}>
      <h1 className="h1 mb-4">Bom dia, {empresaNome.split(" ")[0]}</h1>
      <div className="row gap-3 mb-4 flex-wrap">
        <Stat num={2} label="Contratações ativas" style={{ flex: 1, minWidth: 180 }} />
        <Stat num={1} label="Proposta publicada" style={{ flex: 1, minWidth: 180 }} />
        <Stat num={8} label="Candidaturas recebidas" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="R$ 38k" label="Em escrow" style={{ flex: 1, minWidth: 180 }} />
      </div>

      <div className="card card-pad-lg mb-4">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <h2 className="h2">Candidaturas na sua proposta</h2>
          <button
            type="button"
            className="muted"
            style={{
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              background: "transparent",
            }}
            onClick={() => router.push("/app/propostas/pr1")}
          >
            Ver proposta →
          </button>
        </div>
        <div className="col" style={{ gap: 0 }}>
          {candidatos.map((p, i) => (
            <div
              key={p.id}
              className="row gap-3"
              style={{
                padding: "14px 0",
                borderBottom:
                  i < candidatos.length - 1 ? "0.5px solid var(--border)" : "none",
              }}
            >
              <Avatar name={p.nome} color={p.color} />
              <div className="col" style={{ flex: 1 }}>
                <div className="row gap-2">
                  <strong style={{ fontWeight: 500 }}>{p.nome}</strong>
                  {p.verificado && <Verified />}
                </div>
                <span className="muted" style={{ fontSize: 13 }}>
                  {p.specShort} · {p.cidade}
                </span>
              </div>
              <div className="col" style={{ alignItems: "flex-end" }}>
                <strong style={{ fontWeight: 500 }}>
                  R$ {p.rate}
                  <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                    /h
                  </span>
                </strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  candidatou-se há 4h
                </span>
              </div>
              <button
                className="btn btn-sm"
                type="button"
                onClick={() => router.push(`/app/pentesters/${p.id}`)}
              >
                Ver perfil
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="row gap-3 flex-wrap">
        <div className="card card-pad-lg" style={{ flex: 1, minWidth: 280 }}>
          <h2 className="h2 mb-4">Contratações em andamento</h2>
          {[
            {
              titulo: "Pentest mobile — app cliente",
              pent: "Beatriz Camargo",
              etapa: "Execução",
              prog: 0.6,
            },
            {
              titulo: "Cloud review AWS",
              pent: "João Henrique Souza",
              etapa: "Reteste",
              prog: 0.85,
            },
          ].map((c, i) => (
            <div
              key={c.titulo}
              style={{
                padding: "12px 0",
                borderTop: i ? "0.5px solid var(--border)" : "none",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong style={{ fontWeight: 500 }}>{c.titulo}</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  {c.etapa}
                </span>
              </div>
              <span className="muted" style={{ fontSize: 13 }}>
                com {c.pent}
              </span>
              <div
                style={{
                  height: 4,
                  background: "var(--surface-3)",
                  borderRadius: 999,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    width: `${c.prog * 100}%`,
                    height: "100%",
                    background: "var(--accent)",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="card card-pad-lg" style={{ flex: 1, minWidth: 280 }}>
          <h2 className="h2 mb-4">Atalhos</h2>
          <div className="col" style={{ gap: 8 }}>
            <button
              className="btn"
              style={{ justifyContent: "flex-start" }}
              type="button"
              onClick={() => router.push("/app/propostas")}
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
            >
              <FileText size={14} /> Modelos de NDA e escopo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashPentester({ user }: { user: User }) {
  const router = useRouter();
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
              Seu valor por hora
            </span>
            <span className="muted" style={{ fontSize: 13 }}>
              Defina no perfil
            </span>
          </div>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Faturamento (mês)
            </span>
            <span className="rate-value">R$ 0</span>
          </div>
          <div className="col" style={{ flex: 1, minWidth: 200 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Próximo pagamento
            </span>
            <span style={{ fontSize: 15 }} className="muted">
              —
            </span>
          </div>
        </div>
      </div>

      <div className="row gap-3 mb-4 flex-wrap">
        <Stat num={0} label="Candidaturas ativas" style={{ flex: 1, minWidth: 180 }} />
        <Stat num={0} label="Projeto em andamento" style={{ flex: 1, minWidth: 180 }} />
        <Stat num={0} label="Convites diretos" style={{ flex: 1, minWidth: 180 }} />
        <Stat num="—" label="Rating · sem projetos" style={{ flex: 1, minWidth: 180 }} />
      </div>

      <div className="card card-pad-lg mb-4">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <h2 className="h2">Propostas abertas</h2>
          <button
            type="button"
            className="muted"
            style={{
              fontSize: 13,
              cursor: "pointer",
              border: "none",
              background: "transparent",
            }}
            onClick={() => router.push("/app/propostas")}
          >
            Ver todas →
          </button>
        </div>
        <div className="list-propostas">
          {propostas.slice(0, 3).map((pr) => (
            <PropostaCard key={pr.id} pr={pr} />
          ))}
        </div>
      </div>
    </div>
  );
}
