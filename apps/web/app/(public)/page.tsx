"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, DollarSign, Shield } from "lucide-react";

import { Button } from "@/components/Button";
import { SiteFooter } from "@/components/SiteFooter";
import { Verified } from "@/components/Verified";
import { useAuth } from "@/lib/store";

export default function Landing() {
  const router = useRouter();
  const setAccount = useAuth((s) => s.setAccount);

  return (
    <>
      <div className="container-x hero">
        <h1>Pentest sob demanda. Direto com quem invade.</h1>
        <p className="hero-sub">
          Marketplace que liga empresas a profissionais de pentest verificados. Sem intermediário
          comercial, sem RFP de 60 dias. Você publica o escopo, recebe candidaturas, contrata.
        </p>
        <div className="hero-cta">
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setAccount("empresa");
              router.push("/app/pentesters");
            }}
          >
            Sou empresa <ArrowRight size={14} />
          </Button>
          <Button
            size="lg"
            onClick={() => {
              setAccount("pentester");
              router.push("/app/propostas");
            }}
          >
            Sou pentester <ArrowRight size={14} />
          </Button>
        </div>
        <div
          className="row gap-4 mt-6"
          style={{ color: "var(--text-2)", fontSize: 13, flexWrap: "wrap" }}
        >
          <span className="row" style={{ gap: 6 }}>
            <Shield size={13} /> NDA padrão da plataforma
          </span>
          <span className="row" style={{ gap: 6 }}>
            <Verified title="Selo azul para certificações" />
            Selo azul para certificações
          </span>
          <span className="row" style={{ gap: 6 }}>
            <DollarSign size={13} /> Pagamento em escrow
          </span>
        </div>
      </div>

      <div className="container-x duo">
        <div className="duo-card">
          <span className="duo-eyebrow">Para empresas</span>
          <span className="duo-title">
            Encontre o ofensivo certo em horas, não em meses
          </span>
          <ul className="duo-list">
            <li>
              <Check size={14} /> Filtre por especialidade, certificação e disponibilidade
            </li>
            <li>
              <Check size={14} /> Veja rate por hora, rating e histórico antes de conversar
            </li>
            <li>
              <Check size={14} /> Contrate com NDA e escopo padrão da AegisHub
            </li>
            <li>
              <Check size={14} /> Pagamento liberado só após entrega aceita
            </li>
          </ul>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => {
                setAccount("empresa");
                router.push("/app/pentesters");
              }}
            >
              Ver catálogo de pentesters <ArrowRight size={13} />
            </Button>
          </div>
        </div>

        <div className="duo-card">
          <span className="duo-eyebrow">Para pentesters</span>
          <span className="duo-title">
            Sua agenda, seu valor por hora, sua reputação
          </span>
          <ul className="duo-list">
            <li>
              <Check size={14} /> Defina rate, status e especialidades em um clique
            </li>
            <li>
              <Check size={14} /> Veja propostas filtradas pelo seu perfil técnico
            </li>
            <li>
              <Check size={14} /> Selo azul ao verificar OSCP, CRTP e outras certs
            </li>
            <li>
              <Check size={14} /> Comissão fixa de 8%. Sem fee oculto.
            </li>
          </ul>
          <div className="mt-4">
            <Button
              size="sm"
              onClick={() => {
                setAccount("pentester");
                router.push("/app/propostas");
              }}
            >
              Ver propostas abertas <ArrowRight size={13} />
            </Button>
          </div>
        </div>
      </div>

      <div className="container-x section">
        <div className="row" style={{ gap: 32, flexWrap: "wrap" }}>
          {[
            { num: "312", label: "pentesters verificados" },
            { num: "1.847", label: "projetos concluídos em 2025" },
            { num: "R$ 287", label: "rate médio por hora" },
            { num: "4,8", label: "avaliação média de empresas" },
          ].map((s) => (
            <div key={s.label} className="col" style={{ flex: 1, minWidth: 200 }}>
              <span className="rate-value" style={{ fontSize: 28 }}>
                {s.num}
              </span>
              <span className="muted" style={{ fontSize: 13 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </>
  );
}
