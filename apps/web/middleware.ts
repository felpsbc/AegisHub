import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "pentesthub_session";
const PROTECTED_PREFIXES = ["/app", "/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};
