import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge proxy (Next 16 name for middleware):
 *  1. Tenant addressing — `<slug>.<APP_BASE_HOST>/path` is rewritten to `/<slug>/path` so the
 *     `(public)/[tenant]` routes serve both subdomain and path URLs (same rules as
 *     `extractTenantKey` in src/lib/tenant.ts, re-implemented here because the edge runtime
 *     cannot import Prisma-backed modules).
 *  2. Admin — requests to /admin without a session cookie go to /login. The real check is
 *     `GET /auth/me` in the admin layout; this only avoids rendering the shell for anonymous hits.
 */
const BASE_HOST = (process.env.APP_BASE_HOST ?? "localhost").toLowerCase();
const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? "dgp_session";
const RESERVED_FIRST_SEGMENTS = new Set(["admin", "login", "forgot-password", "reset-password", "api", "_next", "images", "icons", "fonts"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!req.cookies.get(SESSION_COOKIE)?.value) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next({ request: { headers: withPathname(req, pathname) } });
    return res;
  }

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const first = pathname.split("/").filter(Boolean)[0];
  if (host && host !== BASE_HOST && host !== "localhost" && host !== "127.0.0.1" && host.endsWith(`.${BASE_HOST}`)) {
    const label = host.slice(0, -(BASE_HOST.length + 1));
    if (label && !label.includes(".") && label !== "www" && (!first || !RESERVED_FIRST_SEGMENTS.has(first))) {
      const url = req.nextUrl.clone();
      url.pathname = `/${label}${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url, { request: { headers: withPathname(req, pathname) } });
    }
  }

  return NextResponse.next({ request: { headers: withPathname(req, pathname) } });
}

function withPathname(req: NextRequest, pathname: string): Headers {
  const h = new Headers(req.headers);
  h.set("x-pathname", pathname);
  return h;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images/|icons/|fonts/|api/).*)"],
};
