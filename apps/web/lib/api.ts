"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

export const API_BASE = "/api/proxy";
const CSRF_COOKIE = "pentesthub_csrf";

export type TenantType = "COMPANY" | "INDIVIDUAL";
export type DocumentKind = "CNPJ" | "CPF";
export type MembershipRole = "OWNER" | "MEMBER" | "BILLING";

export type CompanyProfile = {
  summary: string;
  about: string;
  website: string;
  industry: string;
  location: string;
  size: string;
  founded_year: number | null;
};

export type Membership = {
  tenant: {
    id: string;
    type: TenantType;
    legal_name: string;
    status: string;
    company_profile: CompanyProfile | null;
  };
  role: MembershipRole;
  pentester_profile_id: string | null;
};

export function pentesterProfileId(u: User | null | undefined): string | null {
  if (!u) return null;
  for (const m of u.memberships) {
    if (m.pentester_profile_id) return m.pentester_profile_id;
  }
  return null;
}

export type User = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  mfa_enabled: boolean;
  email_confirmed_at: string | null;
  memberships: Membership[];
};

export type Account = "empresa" | "pentester" | "admin";

export function accountFromUser(u: User | null | undefined): Account | null {
  if (!u) return null;
  if (u.is_admin) return "admin";
  if (u.memberships.some((m) => m.tenant.type === "COMPANY")) return "empresa";
  if (u.memberships.some((m) => m.tenant.type === "INDIVIDUAL")) return "pentester";
  return null;
}

export function primaryTenant(u: User | null | undefined): Membership["tenant"] | null {
  if (!u) return null;
  return u.memberships[0]?.tenant ?? null;
}

export type FieldError = { field: string; code: string; message?: string };

export class ApiError extends Error {
  status: number;
  payload: unknown;
  fieldErrors: FieldError[];
  constructor(status: number, payload: unknown) {
    const obj =
      payload && typeof payload === "object"
        ? (payload as { detail?: unknown; errors?: unknown })
        : {};
    const fieldErrors: FieldError[] = Array.isArray(obj.errors)
      ? (obj.errors as FieldError[])
      : [];
    // Prefere a mensagem específica do campo (ex.: "Já existe uma conta com este
    // e-mail.") sobre o "Validation error" genérico do envelope.
    const fieldMessage = fieldErrors
      .map((e) => e.message)
      .filter(Boolean)
      .join(" ");
    const detail =
      fieldMessage ||
      (obj.detail !== undefined ? String(obj.detail) : `http_${status}`);
    super(detail);
    this.status = status;
    this.payload = payload;
    this.fieldErrors = fieldErrors;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const target = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }
  return null;
}

async function ensureCsrf(): Promise<void> {
  if (readCookie(CSRF_COOKIE)) return;
  await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

async function rawFetch(path: string, opts: FetchOptions = {}): Promise<Response> {
  const method = (opts.method ?? "GET").toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD";
  if (isMutation) await ensureCsrf();

  const headers = new Headers();
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(opts.body);
  }
  if (isMutation) {
    const token = readCookie(CSRF_COOKIE);
    if (token) headers.set("X-CSRFToken", token);
  }
  headers.set("Accept", "application/json");

  return fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body,
    credentials: "same-origin",
    cache: "no-store",
    signal: opts.signal,
  });
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const res = await rawFetch(path, opts);
  const data = await parseBody(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

// --- Hooks ---

export function useSession(): UseQueryResult<User | null> {
  return useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await apiFetch<User>("/auth/me");
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export type LoginInput = { email: string; password: string };
export type LoginResult =
  | { kind: "success"; user: User }
  | { kind: "mfa_required" };

export function useLogin() {
  const qc = useQueryClient();
  return useMutation<LoginResult, ApiError, LoginInput>({
    mutationFn: async (input) => {
      const res = await rawFetch("/auth/login", { method: "POST", body: input });
      const data = await parseBody(res);
      if (res.status === 202) return { kind: "mfa_required" };
      if (!res.ok) throw new ApiError(res.status, data);
      return { kind: "success", user: data as User };
    },
    onSuccess: (r) => {
      if (r.kind === "success") qc.setQueryData(["auth", "me"], r.user);
    },
  });
}

export type MfaInput = { code: string };

export function useLoginMfa() {
  const qc = useQueryClient();
  return useMutation<User, ApiError, MfaInput>({
    mutationFn: (input) =>
      apiFetch<User>("/auth/login/mfa", { method: "POST", body: input }),
    onSuccess: (user) => {
      qc.setQueryData(["auth", "me"], user);
    },
  });
}

export type RegisterInput = {
  email: string;
  password: string;
  full_name: string;
  tenant_type: TenantType;
  legal_name: string;
  document: string;
  document_kind: DocumentKind;
};

export function useRegister() {
  return useMutation<User, ApiError, RegisterInput>({
    mutationFn: (input) =>
      apiFetch<User>("/auth/register", { method: "POST", body: input }),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      await apiFetch<null>("/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      qc.setQueryData(["auth", "me"], null);
      qc.removeQueries({ queryKey: ["auth", "me"] });
    },
  });
}

export type ConfirmEmailInput = { uidb64: string; token: string };

export function useConfirmEmail() {
  return useMutation<{ detail: string }, ApiError, ConfirmEmailInput>({
    mutationFn: ({ uidb64, token }) =>
      apiFetch<{ detail: string }>(`/auth/email/confirm/${uidb64}/${token}`, {
        method: "POST",
      }),
  });
}

export function useResendConfirmation() {
  return useMutation<void, ApiError, { email: string }>({
    mutationFn: async ({ email }) => {
      await apiFetch<null>("/auth/email/resend", { method: "POST", body: { email } });
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation<void, ApiError, { email: string }>({
    mutationFn: async ({ email }) => {
      await apiFetch<null>("/auth/password/reset", { method: "POST", body: { email } });
    },
  });
}

export type ResetPasswordInput = {
  uidb64: string;
  token: string;
  new_password: string;
};

export function useResetPassword() {
  return useMutation<{ detail: string }, ApiError, ResetPasswordInput>({
    mutationFn: (input) =>
      apiFetch<{ detail: string }>("/auth/password/reset/confirm", {
        method: "POST",
        body: input,
      }),
  });
}

// --- Domain types ---

export type Specialty = { id: number; code: string; label: string };
export type PentesterAvailability = "OPEN" | "BUSY" | "UNAVAILABLE";

export type Pentester = {
  id: string;
  legal_name: string;
  headline: string;
  bio: string;
  hourly_rate: string | null;
  currency: string;
  availability: PentesterAvailability;
  location: string;
  remote_only: boolean;
  rating_avg: string | null;
  rating_count: number;
  verified_at: string | null;
  specialties: Specialty[];
  certifications: Array<{
    code: string;
    label: string;
    issued_at: string | null;
    expires_at: string | null;
    verification: string;
    verified_at: string | null;
  }>;
};

export type ProposalStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "CONTRACTED"
  | "CLOSED"
  | "ARCHIVED";

export type Proposal = {
  id: string;
  company: string;
  company_id: string;
  title: string;
  description: string;
  scope_md: string;
  budget_amount: string | null;
  budget_currency: string;
  budget_kind: "FIXED" | "HOURLY" | "RANGE" | "NEGOTIABLE";
  duration_weeks: number | null;
  status: ProposalStatus;
  visibility: "PUBLIC" | "INVITE_ONLY";
  specialties: Specialty[];
  published_at: string | null;
  created_at: string;
  company_profile?: CompanyProfile | null;
};

export type ApplicationStatus =
  | "SUBMITTED"
  | "SHORTLISTED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type Application = {
  id: string;
  proposal_id: string;
  pentester_id: string;
  pentester_name: string;
  cover_message: string;
  proposed_rate: string | null;
  proposed_total: string | null;
  status: ApplicationStatus;
  created_at: string;
};

// --- Pentesters ---

export type PentesterFilters = {
  q?: string;
  specialty?: string;
  min_rate?: number;
  max_rate?: number;
};

function queryString(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "" || v === null) continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

export function usePentesters(filters: PentesterFilters = {}) {
  return useQuery<Pentester[]>({
    queryKey: ["pentesters", filters],
    queryFn: () => apiFetch<Pentester[]>(`/pentesters${queryString(filters)}`),
    staleTime: 30_000,
  });
}

export function usePentester(id: string | null | undefined) {
  return useQuery<Pentester>({
    queryKey: ["pentester", id],
    queryFn: () => apiFetch<Pentester>(`/pentesters/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

// --- Proposals ---

export type ProposalFilters = {
  q?: string;
  specialty?: string;
  mine?: boolean;
};

export function useProposals(filters: ProposalFilters = {}) {
  const params: Record<string, string | number | undefined> = {
    q: filters.q,
    specialty: filters.specialty,
  };
  if (filters.mine) params.mine = "1";
  return useQuery<Proposal[]>({
    queryKey: ["proposals", filters],
    queryFn: () => apiFetch<Proposal[]>(`/proposals${queryString(params)}`),
    staleTime: 30_000,
  });
}

export function useProposal(id: string | null | undefined) {
  return useQuery<Proposal>({
    queryKey: ["proposal", id],
    queryFn: () => apiFetch<Proposal>(`/proposals/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export type CreateProposalInput = {
  title: string;
  description: string;
  scope_md: string;
  budget: { kind: "FIXED" | "HOURLY" | "RANGE" | "NEGOTIABLE"; amount?: number | null; currency?: string };
  duration_weeks?: number | null;
  visibility?: "PUBLIC" | "INVITE_ONLY";
  specialties?: number[];
};

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation<Proposal, ApiError, CreateProposalInput>({
    mutationFn: (input) =>
      apiFetch<Proposal>("/proposals", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function usePublishProposal() {
  const qc = useQueryClient();
  return useMutation<Proposal, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<Proposal>(`/proposals/${id}/publish`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

export function useCloseProposal() {
  const qc = useQueryClient();
  return useMutation<Proposal, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<Proposal>(`/proposals/${id}/close`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });
}

// --- Applications ---

export type CreateApplicationInput = {
  proposalId: string;
  cover_message: string;
  proposed_rate?: number | null;
  proposed_total?: number | null;
};

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation<Application, ApiError, CreateApplicationInput>({
    mutationFn: ({ proposalId, ...body }) =>
      apiFetch<Application>(`/proposals/${proposalId}/applications/new`, {
        method: "POST",
        body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useMyApplications() {
  return useQuery<Application[]>({
    queryKey: ["applications", "mine"],
    queryFn: () => apiFetch<Application[]>("/applications/mine"),
    staleTime: 30_000,
  });
}

export function useApplicationsForProposal(proposalId: string | null | undefined) {
  return useQuery<Application[]>({
    queryKey: ["applications", "proposal", proposalId],
    queryFn: () =>
      apiFetch<Application[]>(`/proposals/${proposalId}/applications`),
    enabled: !!proposalId,
    staleTime: 30_000,
  });
}

// --- Favorites ---

export type FavoriteTargetType = "pentester" | "proposal";

export type FavoritePentesterTarget = {
  legal_name: string;
  headline: string;
  bio: string;
  hourly_rate: string | null;
  currency: string;
  availability: PentesterAvailability;
  location: string;
  rating_avg: number | null;
  verified: boolean;
  specialties: string[];
};

export type FavoriteProposalTarget = {
  title: string;
  description: string;
  company: string;
  budget_amount: string | null;
  budget_currency: string;
  budget_kind: string;
  duration_weeks: number | null;
  status: ProposalStatus;
  published_at: string | null;
  specialties: string[];
};

export type Favorite = {
  id: string;
  target_type: FavoriteTargetType;
  target_id: string;
  target: FavoritePentesterTarget | FavoriteProposalTarget | null;
  created_at: string;
};

export function useFavorites(type?: FavoriteTargetType) {
  return useQuery<Favorite[]>({
    queryKey: ["favorites", type ?? "all"],
    queryFn: () =>
      apiFetch<Favorite[]>(`/favorites${type ? `?type=${type}` : ""}`),
    staleTime: 15_000,
  });
}

export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation<
    Favorite,
    ApiError,
    { target_type: FavoriteTargetType; target_id: string }
  >({
    mutationFn: (input) =>
      apiFetch<Favorite>("/favorites", { method: "POST", body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (favoriteId) => {
      await apiFetch<null>(`/favorites/${favoriteId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}

// --- Company profile ---

export function useCompanyProfile(enabled = true) {
  return useQuery<CompanyProfile>({
    queryKey: ["company", "profile"],
    queryFn: () => apiFetch<CompanyProfile>("/company/profile"),
    enabled,
    staleTime: 30_000,
  });
}

export type CompanyProfilePatch = Partial<CompanyProfile>;

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation<CompanyProfile, ApiError, CompanyProfilePatch>({
    mutationFn: (input) =>
      apiFetch<CompanyProfile>("/company/profile", { method: "PATCH", body: input }),
    onSuccess: (profile) => {
      qc.setQueryData(["company", "profile"], profile);
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
  });
}

// --- Specialties / Pentester profile / Availability ---

export function useSpecialties() {
  return useQuery<Specialty[]>({
    queryKey: ["specialties"],
    queryFn: () => apiFetch<Specialty[]>("/specialties"),
    staleTime: 5 * 60_000,
  });
}

export type PentesterPatch = Partial<{
  headline: string;
  bio: string;
  hourly_rate: number;
  currency: string;
  availability: PentesterAvailability;
  location: string;
  remote_only: boolean;
  specialties: number[];
}>;

export function useUpdatePentester(publicId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<Pentester, ApiError, PentesterPatch>({
    mutationFn: (input) =>
      apiFetch<Pentester>(`/pentesters/${publicId}`, {
        method: "PATCH",
        body: input,
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["pentesters"] });
      qc.setQueryData(["pentester", publicId], p);
    },
  });
}

export function useUpdateAvailability(publicId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation<void, ApiError, PentesterAvailability>({
    mutationFn: async (availability) => {
      await apiFetch<null>(`/pentesters/${publicId}/availability`, {
        method: "PATCH",
        body: { availability },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pentester", publicId] }),
  });
}

// --- Admin ---

export type AdminStats = {
  users_total: number;
  users_active: number;
  companies: number;
  pentesters: number;
  proposals_total: number;
  proposals_published: number;
  applications_total: number;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  is_active: boolean;
  email_confirmed_at: string | null;
  mfa_enabled: boolean;
  last_login_at: string | null;
  created_at: string;
  role: string;
};

export type AdminProposal = {
  id: string;
  company: string;
  title: string;
  status: string;
  visibility: string;
  budget_amount: string | null;
  budget_currency: string;
  budget_kind: string;
  applications_count: number;
  published_at: string | null;
  created_at: string;
};

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch<AdminStats>("/admin/stats"),
    staleTime: 15_000,
  });
}

export function useAdminUsers(q?: string) {
  return useQuery<AdminUser[]>({
    queryKey: ["admin", "users", q ?? ""],
    queryFn: () => apiFetch<AdminUser[]>(`/admin/users${queryString({ q })}`),
    staleTime: 10_000,
  });
}

export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation<AdminUser, ApiError, { id: string; active: boolean }>({
    mutationFn: ({ id, active }) =>
      apiFetch<AdminUser>(`/admin/users/${id}/active`, {
        method: "POST",
        body: { active },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useAdminProposals(q?: string) {
  return useQuery<AdminProposal[]>({
    queryKey: ["admin", "proposals", q ?? ""],
    queryFn: () => apiFetch<AdminProposal[]>(`/admin/proposals${queryString({ q })}`),
    staleTime: 10_000,
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      await apiFetch<null>(`/admin/proposals/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "proposals"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
