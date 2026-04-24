import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "vouchmi_session";

const PUBLIC_PREFIXES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email-pending",
  "/@",
  "/c/",
  "/_next",
  "/api",
  "/sanctum",
  "/storage",
  "/favicon",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Block protected areas without token
  if (!token && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Intentionally NOT redirecting logged-in users away from /login, /register,
  // /forgot-password. A stale cookie (e.g. after a password reset invalidates
  // tokens server-side) would otherwise cause a redirect loop here:
  // / → auth check 401 → /login → proxy back to / → loop. Let the auth pages
  // themselves handle the already-authenticated case if desired.

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
