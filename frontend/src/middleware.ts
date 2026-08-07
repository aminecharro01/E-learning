import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.NEXT_PUBLIC_JWT_COOKIE_NAME || "iat_token";
const STAFF_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "FORMATEUR"]);

/**
 * Reads the `role` claim without verifying the signature — this is a UX-level
 * redirect only. The backend independently verifies + re-checks the role via
 * @PreAuthorize on every /api/admin/** call, which is the real security boundary.
 */
function readRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { role?: string };
    return claims.role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const isAdminRoute = pathname.startsWith("/admin");
  const isProtected = isAdminRoute || pathname.startsWith("/app");

  if (isProtected && !token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAdminRoute && token) {
    const role = readRole(token);
    if (!role || !STAFF_ROLES.has(role)) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};
