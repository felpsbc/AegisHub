"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Field, Input, Select, Textarea } from "@/components/Field";
import {
  accountFromUser,
  useCreateProposal,
  usePublishProposal,
  useSession,
  useSpecialties,
} from "@/lib/api";
import { useToast } from "@/lib/store";

type BudgetKind = "FIXED" | "HOURLY" | "RANGE" | "NEGOTIABLE";

export default function NovaPropostaPage() {
  const router = useRouter();
  const showToast = useToast((s) => s.show);
  const { data: user, isLoading } = useSession();
  const create = useCreateProposal();
  const publish = usePublishProposal();
  const specialties = useSpecialties();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("");
  const [budgetKind, setBudgetKind] = useState<BudgetKind>("FIXED");
  const [amount, setAmount] = useState("");
  const [weeks, setWeeks] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
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
        <p className="muted">Apenas contas empresa podem publicar propostas.</p>
      </div>
    );
  }

  const toggleSpec = (id: number) => {
    setSelectedSpecialties((curr) =>
      curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id],
    );
  };

  const submit = async (mode: "draft" | "publish") => {
    setError(null);
    try {
      const created = await create.mutateAsync({
        title,
        description,
        scope_md: scope,
        budget: {
          kind: budgetKind,
          amount: amount ? Number(amount) : null,
          currency: "BRL",
        },
        duration_weeks: weeks ? Number(weeks) : null,
        specialties: selectedSpecialties,
      });
      if (mode === "publish") {
        await publish.mutateAsync(created.id);
        showToast("Proposta publicada");
      } else {
        showToast("Rascunho salvo");
      }
      router.replace("/app/minhas-propostas");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao salvar.";
      setError(msg);
    }
  };

  const busy = create.isPending || publish.isPending;

  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 760 }}>
      <Link
        href="/app/minhas-propostas"
        className="btn btn-ghost btn-sm mb-4"
        style={{ display: "inline-flex" }}
      >
        <ArrowLeft size={13} /> Voltar
      </Link>
      <h1 className="h1 mb-4">Nova proposta</h1>

      <div className="card card-pad-lg">
        <Field label="Título" hint="Entre 8 e 140 caracteres.">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Pentest web app — fintech"
            minLength={8}
            maxLength={140}
            required
          />
        </Field>

        <Field label="Descrição">
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contexto, motivação, expectativas."
          />
        </Field>

        <Field label="Escopo (markdown)">
          <Textarea
            rows={6}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Listar URLs, endpoints, ambientes, integrações, etc."
          />
        </Field>

        <div className="row gap-3 flex-wrap">
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Modalidade de pagamento">
              <Select
                value={budgetKind}
                onChange={(e) => setBudgetKind(e.target.value as BudgetKind)}
              >
                <option value="FIXED">Valor fixo</option>
                <option value="HOURLY">Por hora</option>
                <option value="RANGE">Faixa</option>
                <option value="NEGOTIABLE">A combinar</option>
              </Select>
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Valor (R$)">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="100"
                placeholder="0,00"
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <Field label="Duração (semanas)">
              <Input
                type="number"
                value={weeks}
                onChange={(e) => setWeeks(e.target.value)}
                min={1}
                placeholder="4"
              />
            </Field>
          </div>
        </div>

        <div className="mt-4">
          <span className="label">Especialidades</span>
          <div className="chips">
            {(specialties.data ?? []).map((s) => {
              const active = selectedSpecialties.includes(s.id);
              return (
                <button
                  key={s.code}
                  type="button"
                  className={active ? "pill pill-active" : "pill"}
                  onClick={() => toggleSpec(s.id)}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            className="mt-4 text-xs"
            style={{ color: "var(--danger)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="row gap-2 mt-6" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn"
            type="button"
            disabled={busy}
            onClick={() => submit("draft")}
          >
            Salvar rascunho
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy || title.length < 8}
            onClick={() => submit("publish")}
          >
            {busy ? "Salvando…" : "Publicar agora"}
          </button>
        </div>
      </div>
    </div>
  );
}
