import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM_BASE = (process.env.API_INTERNAL_URL ?? "http://api:8000").replace(/\/+$/, "");
const API_PREFIX = "/api/v1";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
]);

function buildUpstreamUrl(req: NextRequest, segments: string[]): string {
  const path = segments.map(encodeURIComponent).join("/");
  const qs = req.nextUrl.search ?? "";
  return `${UPSTREAM_BASE}${API_PREFIX}/${path}${qs}`;
}

function filterRequestHeaders(req: NextRequest): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    out.set(key, value);
  });
  return out;
}

function getSetCookies(headers: Headers): string[] {
  const anyHeaders = headers as unknown as {
    getSetCookie?: () => string[];
    raw?: () => Record<string, string[]>;
  };
  if (typeof anyHeaders.getSetCookie === "function") return anyHeaders.getSetCookie();
  if (typeof anyHeaders.raw === "function") return anyHeaders.raw()["set-cookie"] ?? [];
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

async function forward(req: NextRequest, segments: string[]): Promise<Response> {
  const url = buildUpstreamUrl(req, segments);
  const headers = filterRequestHeaders(req);
  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      redirect: "manual",
    });
  } catch (err) {
    return NextResponse.json(
      { detail: "upstream_unreachable", error: String(err) },
      { status: 502 },
    );
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "set-cookie") return;
    resHeaders.set(key, value);
  });
  for (const cookie of getSetCookies(upstream.headers)) {
    resHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

type RouteCtx = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const { path } = await ctx.params;
  return forward(req, path ?? []);
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
  handler as OPTIONS,
};
