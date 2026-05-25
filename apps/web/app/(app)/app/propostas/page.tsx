"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { CheckboxRow } from "@/components/CheckboxRow";
import { PropostaCard } from "@/components/PropostaCard";
import { RadioRow } from "@/components/RadioRow";
import {
  accountFromUser,
  useProposals,
  useSession,
  useSpecialties,
} from "@/lib/api";

type ModalidadeSel = "all" | "remoto" | "presencial";

export default function PropostasCatalogPage() {
  const router = useRouter();
  const { data: user } = useSession();
  const account = accountFromUser(user);

  const [query, setQuery] = useState("");
  const [specialtySel, setSpecialtySel] = useState<string>("");
  const [modalidade, setModalidade] = useState<ModalidadeSel>("all");
  const [budgetMin, setBudgetMin] = useState(0);

  // Empresa vê suas próprias propostas (?mine=1); pentester vê o feed PUBLISHED.
  const list = useProposals({
    q: query || undefined,
    specialty: specialtySel || undefined,
    mine: account === "empresa",
  });
  const specialties = useSpecialties();

  const items = useMemo(() => {
    const all = list.data ?? [];
    return all.filter((pr) => {
      const amount = pr.budget_amount ? Number(pr.budget_amount) : 0;
      if (budgetMin > 0 && amount < budgetMin) return false;
      // modalidade ainda não vem do backend; quando vier, filtrar aqui também.
      void modalidade;
      return true;
    });
  }, [list.data, budgetMin, modalidade]);

  return (
    <div className="container-x catalog">
      <aside className="sidebar">
        <div className="sidebar-section" style={{ paddingTop: 0 }}>
          <h3>Buscar</h3>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-3)",
              }}
            >
              <Search size={13} />
            </span>
            <input
              className="input"
              placeholder="Título da proposta"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Modalidade</h3>
          <RadioRow
            name="modalidade"
            value="all"
            label="Todas"
            checked={modalidade === "all"}
            onChange={(v) => setModalidade(v as ModalidadeSel)}
          />
          <RadioRow
            name="modalidade"
            value="remoto"
            label="Remoto"
            checked={modalidade === "remoto"}
            onChange={(v) => setModalidade(v as ModalidadeSel)}
          />
          <RadioRow
            name="modalidade"
            value="presencial"
            label="Presencial"
            checked={modalidade === "presencial"}
            onChange={(v) => setModalidade(v as ModalidadeSel)}
          />
        </div>

        <div className="sidebar-section">
          <h3>Budget mínimo — R$ {budgetMin.toLocaleString("pt-BR")}</h3>
          <input
            className="range"
            type="range"
            min={0}
            max={100000}
            step={2000}
            value={budgetMin}
            onChange={(e) => setBudgetMin(Number(e.target.value))}
          />
          <div
            className="row"
            style={{
              justifyContent: "space-between",
              fontSize: 11,
              color: "var(--text-3)",
              marginTop: 6,
            }}
          >
            <span>R$ 0</span>
            <span>R$ 100k</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Especialidade</h3>
          <CheckboxRow
            label="Todas"
            checked={specialtySel === ""}
            onChange={() => setSpecialtySel("")}
          />
          {(specialties.data ?? []).slice(0, 12).map((s) => (
            <CheckboxRow
              key={s.code}
              label={s.label}
              checked={specialtySel === s.code}
              onChange={() => setSpecialtySel(specialtySel === s.code ? "" : s.code)}
            />
          ))}
        </div>
      </aside>

      <div className="catalog-main">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="h1">
              {account === "empresa" ? "Minhas propostas" : "Propostas abertas"}
            </h1>
            <span className="muted" style={{ fontSize: 13 }}>
              {list.isLoading ? "carregando…" : `${items.length} propostas`}
            </span>
          </div>
          {account === "empresa" && (
            <button
              className="btn btn-primary btn-sm"
              type="button"
              onClick={() => router.push("/app/propostas/nova")}
            >
              <Plus size={13} /> Publicar proposta
            </button>
          )}
        </div>

        {list.isError && (
          <div
            className="card"
            style={{ textAlign: "center", padding: 32, color: "var(--danger)" }}
          >
            Falha ao carregar propostas. Recarregue.
          </div>
        )}

        {!list.isError && items.length === 0 && !list.isLoading && (
          <div
            className="card"
            style={{ textAlign: "center", padding: 48, color: "var(--text-2)" }}
          >
            Nenhuma proposta com esses filtros.
          </div>
        )}

        {items.length > 0 && (
          <div className="list-propostas">
            {items.map((pr) => (
              <PropostaCard key={pr.id} pr={pr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
