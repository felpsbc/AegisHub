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

export type Membership = {
  tenant: {
    id: string;
    type: TenantType;
    legal_name: string;
    status: string;
  };
  role: MembershipRole;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  is_admin: boolean;
  mfa_enabled: boolean;
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

export class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(status: number, payload: unknown) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : `http_${status}`;
    super(detail);
    this.status = status;
    this.payload = payload;
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
