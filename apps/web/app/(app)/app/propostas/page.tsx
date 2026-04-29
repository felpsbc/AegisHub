"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { CheckboxRow } from "@/components/CheckboxRow";
import { PropostaCard } from "@/components/PropostaCard";
import { propostas, type Proposta, type TipoTeste } from "@/lib/mock";
import { useAuth } from "@/lib/store";

const allTags = [
  "Web app",
  "API",
  "Mobile",
  "Cloud",
  "Red team",
  "Eng. social",
  "IoT",
  "Hardware",
  "Active Directory",
];

type RemotoSel = "all" | "remoto" | "presencial";

export default function PropostasCatalogPage() {
  const account = useAuth((s) => s.account);
  const [tagsSel, setTags] = useState<Set<string>>(new Set());
  const [budgetMin, setBudgetMin] = useState(10000);
  const [tipoSel, setTipoSel] = useState<Set<TipoTeste>>(new Set());
  const [remotoSel, setRemoto] = useState<RemotoSel>("all");
  const [query, setQuery] = useState("");

  const toggleStr = (set: Set<string>, setter: (s: Set<string>) => void) => (val: string) => {
    const n = new Set(set);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    setter(n);
  };
  const toggleTipo = (val: TipoTeste) => {
    const n = new Set(tipoSel);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    setTipoSel(n);
  };

  const list = useMemo<Proposta[]>(
    () =>
      propostas.filter((pr) => {
        const q = query.toLowerCase();
        if (q && !pr.titulo.toLowerCase().includes(q)) return false;
        if (tagsSel.size && !pr.categorias.some((c) => tagsSel.has(c.label))) return false;
        if (pr.budget < budgetMin) return false;
        if (tipoSel.size && !tipoSel.has(pr.tipoTeste)) return false;
        if (remotoSel === "remoto" && !pr.remoto) return false;
        if (remotoSel === "presencial" && pr.remoto) return false;
        return true;
      }),
    [query, tagsSel, budgetMin, tipoSel, remotoSel],
  );

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
          <CheckboxRow
            label="Remoto"
            checked={remotoSel === "remoto"}
            onChange={() => setRemoto(remotoSel === "remoto" ? "all" : "remoto")}
          />
          <CheckboxRow
            label="Presencial"
            checked={remotoSel === "presencial"}
            onChange={() =>
              setRemoto(remotoSel === "presencial" ? "all" : "presencial")
            }
          />
        </div>

        <div className="sidebar-section">
          <h3>Budget mínimo — R$ {budgetMin.toLocaleString("pt-BR")}</h3>
          <input
            className="range"
            type="range"
            min={10000}
            max={60000}
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
            <span>R$ 10k</span>
            <span>R$ 60k</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Tipo de teste</h3>
          {(["Black-box", "Gray-box", "White-box"] as TipoTeste[]).map((t) => (
            <CheckboxRow
              key={t}
              label={t}
              checked={tipoSel.has(t)}
              onChange={() => toggleTipo(t)}
            />
          ))}
        </div>

        <div className="sidebar-section">
          <h3>Categoria</h3>
          {allTags.map((t) => (
            <CheckboxRow
              key={t}
              label={t}
              checked={tagsSel.has(t)}
              onChange={() => toggleStr(tagsSel, setTags)(t)}
            />
          ))}
        </div>
      </aside>

      <div className="catalog-main">
        <div className="row mb-4" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 className="h1">Propostas abertas</h1>
            <span className="muted" style={{ fontSize: 13 }}>
              {list.length} propostas
            </span>
          </div>
          {account === "empresa" && (
            <button className="btn btn-primary btn-sm" type="button">
              <Plus size={13} /> Publicar proposta
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div
            className="card"
            style={{ textAlign: "center", padding: 48, color: "var(--text-2)" }}
          >
            Nenhuma proposta com esses filtros.
          </div>
        ) : (
          <div className="list-propostas">
            {list.map((pr) => (
              <PropostaCard key={pr.id} pr={pr} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
