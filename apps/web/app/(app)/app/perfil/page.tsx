"use client";

import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { Field, Input, Textarea } from "@/components/Field";
import { Pill } from "@/components/Pill";
import { Verified } from "@/components/Verified";
import {
  accountFromUser,
  pentesterProfileId,
  useCompanyProfile,
  usePentester,
  useResendConfirmation,
  useSession,
  useSpecialties,
  useUpdateAvailability,
  useUpdateCompanyProfile,
  useUpdatePentester,
  type User,
} from "@/lib/api";
import { useToast } from "@/lib/store";

export default function PerfilPage() {
  const { data: user, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="container-x" style={{ padding: "32px 0" }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Carregando…
        </span>
      </div>
    );
  }
  if (!user) return null;

  const account = accountFromUser(user);
  if (account === "pentester") return <PentesterPerfil user={user} />;
  if (account === "empresa") return <EmpresaPerfil user={user} />;
  return <AdminPerfil user={user} />;
}

function PendingEmailBanner({ user }: { user: User }) {
  const resend = useResendConfirmation();
  const showToast = useToast((s) => s.show);
  // O backend não devolve email_confirmed_at em UserMe ainda — mas se for entregue depois,
  // este banner some sozinho via `mfa_enabled`-like condicional.
  return (
    <div
      className="card"
      style={{
        background: "var(--surface-2, var(--surface))",
        border: "0.5px dashed var(--border)",
        padding: 14,
        marginBottom: 16,
      }}
    >
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <span className="muted" style={{ fontSize: 13 }}>
          Não recebeu o e-mail de confirmação? Confira a inbox ou reenvie.
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={resend.isPending}
          onClick={async () => {
            try {
              await resend.mutateAsync({ email: user.email });
              showToast("E-mail de confirmação reenviado");
            } catch {
              showToast("Não foi possível reenviar agora.");
            }
          }}
        >
          {resend.isPending ? "Enviando…" : "Reenviar e-mail"}
        </button>
      </div>
    </div>
  );
}

function PentesterPerfil({ user }: { user: User }) {
  const showToast = useToast((s) => s.show);
  const profileId = pentesterProfileId(user);
  const profile = usePentester(profileId);
  const updateProfile = useUpdatePentester(profileId);
  const updateAvailability = useUpdateAvailability(profileId);
  const specialties = useSpecialties();

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [rate, setRate] = useState<number>(280);
  const [selected, setSelected] = useState<number[]>([]);

  useEffect(() => {
    if (!profile.data) return;
    setHeadline(profile.data.headline ?? "");
    setBio(profile.data.bio ?? "");
    setLocation(profile.data.location ?? "");
    setRate(profile.data.hourly_rate ? Number(profile.data.hourly_rate) : 280);
    setSelected(
      profile.data.specialties.map((s) => s.id).filter((id): id is number => typeof id === "number"),
    );
  }, [profile.data]);

  const status = profile.data?.availability ?? "OPEN";

  const save = async () => {
    try {
      await updateProfile.mutateAsync({
        headline,
        bio,
        location,
        hourly_rate: rate,
        specialties: selected,
      });
      showToast("Perfil atualizado");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  };

  const setStatus = async (a: "OPEN" | "BUSY") => {
    try {
      await updateAvailability.mutateAsync(a);
      showToast(a === "OPEN" ? "Agora aberto a propostas" : "Marcado como em projeto");
    } catch {
      showToast("Falha ao atualizar status.");
    }
  };

  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Seu perfil</h1>
      {!user.email_confirmed_at && <PendingEmailBanner user={user} />}
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={user.full_name} size="lg" />
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <div className="row gap-2">
              <strong style={{ fontWeight: 500 }}>{user.full_name}</strong>
              {user.mfa_enabled && <Verified title="MFA ativado" />}
            </div>
            <span className="muted" style={{ fontSize: 13 }}>
              {user.email}
            </span>
          </div>
        </div>
        <hr className="hr" />

        <div className="row gap-3 mb-4 flex-wrap">
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className="label">Status</span>
            <div className="toggle">
              <button
                className={status === "OPEN" ? "active" : ""}
                onClick={() => setStatus("OPEN")}
                type="button"
                disabled={updateAvailability.isPending}
              >
                <span className="dot dot-open" />
                Aberto
              </button>
              <button
                className={status === "BUSY" ? "active" : ""}
                onClick={() => setStatus("BUSY")}
                type="button"
                disabled={updateAvailability.isPending}
              >
                <span className="dot dot-busy" />
                Em projeto
              </button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className="label">Valor por hora — R$ {rate}</span>
            <input
              className="range"
              type="range"
              min={100}
              max={1000}
              step={20}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
            />
          </div>
        </div>

        <Field label="Headline (resumo curto)">
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Ex.: Pentest web, API e cloud"
            maxLength={140}
          />
        </Field>

        <Field label="Bio">
          <Textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre você e seu trabalho."
          />
        </Field>

        <Field label="Cidade">
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Cidade, UF"
          />
        </Field>

        <div className="mt-4">
          <span className="label">Especialidades</span>
          <div className="chips">
            {(specialties.data ?? []).map((s) => {
              const active = selected.includes(s.id);
              return (
                <Pill
                  key={s.code}
                  active={active}
                  onClick={() =>
                    setSelected((curr) =>
                      curr.includes(s.id)
                        ? curr.filter((x) => x !== s.id)
                        : [...curr, s.id],
                    )
                  }
                >
                  {s.label}
                </Pill>
              );
            })}
          </div>
        </div>

        <div className="row mt-6" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={save}
            disabled={updateProfile.isPending || !profileId}
          >
            {updateProfile.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmpresaPerfil({ user }: { user: User }) {
  const showToast = useToast((s) => s.show);
  const tenant = user.memberships.find((m) => m.tenant.type === "COMPANY")?.tenant;
  const legalName = tenant?.legal_name ?? user.full_name;

  const profile = useCompanyProfile();
  const update = useUpdateCompanyProfile();

  const [summary, setSummary] = useState("");
  const [about, setAbout] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [size, setSize] = useState("");
  const [foundedYear, setFoundedYear] = useState("");

  useEffect(() => {
    const p = profile.data ?? tenant?.company_profile;
    if (!p) return;
    setSummary(p.summary ?? "");
    setAbout(p.about ?? "");
    setWebsite(p.website ?? "");
    setIndustry(p.industry ?? "");
    setLocation(p.location ?? "");
    setSize(p.size ?? "");
    setFoundedYear(p.founded_year != null ? String(p.founded_year) : "");
  }, [profile.data, tenant?.company_profile]);

  const save = async () => {
    try {
      await update.mutateAsync({
        summary,
        about,
        website,
        industry,
        location,
        size,
        founded_year: foundedYear ? Number(foundedYear) : null,
      });
      showToast("Perfil da empresa atualizado");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Falha ao salvar.");
    }
  };

  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Perfil da empresa</h1>
      {!user.email_confirmed_at && <PendingEmailBanner user={user} />}
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={legalName} size="lg" />
          <div className="col" style={{ flex: 1, gap: 2 }}>
            <strong style={{ fontWeight: 500 }}>{legalName}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {user.email}
            </span>
          </div>
        </div>
        <hr className="hr" />

        <p className="muted mb-4" style={{ fontSize: 13 }}>
          Preencha as informações públicas da empresa — é o que os pentesters
          veem ao avaliar suas propostas.
        </p>

        <Field label="Resumo" hint="Uma linha sobre a empresa (até 200 caracteres).">
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Ex.: Fintech de pagamentos B2B"
            maxLength={200}
          />
        </Field>

        <Field label="Sobre a empresa (história)">
          <Textarea
            rows={6}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Conte a história, missão e o que torna sua empresa única."
            maxLength={8000}
          />
        </Field>

        <div className="row gap-3 flex-wrap">
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="Setor">
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Ex.: Serviços financeiros"
                maxLength={120}
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <Field label="Site">
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://suaempresa.com.br"
                type="url"
              />
            </Field>
          </div>
        </div>

        <div className="row gap-3 flex-wrap">
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Localização">
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Cidade, UF"
                maxLength={120}
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Tamanho">
              <Input
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="Ex.: 11–50 funcionários"
                maxLength={40}
              />
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Field label="Fundada em">
              <Input
                type="number"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                min={1800}
                max={2100}
                placeholder="2018"
              />
            </Field>
          </div>
        </div>

        <div className="row mt-6" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            type="button"
            onClick={save}
            disabled={update.isPending}
          >
            {update.isPending ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPerfil({ user }: { user: User }) {
  return (
    <div className="container-x" style={{ padding: "32px 0 64px", maxWidth: 800 }}>
      <h1 className="h1 mb-4">Perfil</h1>
      <div className="card card-pad-lg">
        <div className="row gap-3">
          <Avatar name={user.full_name} size="lg" />
          <div className="col">
            <strong style={{ fontWeight: 500 }}>{user.full_name}</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              {user.email} · Operações
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
