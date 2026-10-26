import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { getAuthContext, type AuthContext } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { AppError, Errors, isAppError } from "@/lib/errors";
import type { ApiErrorBody, ApiPaginated, ApiSuccess } from "@/types/api";

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function paginated<T>(page: { items: T[]; nextCursor: string | null; limit: number }) {
  return NextResponse.json<ApiPaginated<T>>({
    data: page.items,
    page: { nextCursor: page.nextCursor, limit: page.limit },
  });
}

export function errorResponse(err: AppError) {
  const body: ApiErrorBody = {
    error: { code: err.code, message: err.message, ...(err.details !== undefined ? { details: err.details } : {}) },
  };
  const headers: Record<string, string> = {};
  if (err.code === "RATE_LIMITED" && typeof (err.details as { retryAfterSeconds?: number })?.retryAfterSeconds === "number") {
    headers["Retry-After"] = String((err.details as { retryAfterSeconds: number }).retryAfterSeconds);
  }
  return NextResponse.json(body, { status: err.status, headers });
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

export interface ClientInfo {
  ipAddress: string | null;
  userAgent: string | null;
}

export function getClientInfo(req: Request): ClientInfo {
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded ? (forwarded.split(",")[0]?.trim() ?? null) : (req.headers.get("x-real-ip") ?? null);
  return { ipAddress, userAgent: req.headers.get("user-agent") };
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF defence for cookie-authenticated mutations: when a browser sends an `Origin` header it
 * must match the app origin. Requests without `Origin` (non-browser clients, same-origin GET)
 * are allowed; browsers always send `Origin` on cross-site mutating requests.
 */
export function assertTrustedOrigin(req: Request) {
  if (!MUTATING.has(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const allowed = new URL(getEnv().APP_ORIGIN).origin;
  if (origin !== allowed) {
    // Also allow tenant subdomains of the base host (admin may be served there later).
    try {
      const host = new URL(origin).hostname;
      const base = getEnv().APP_BASE_HOST;
      if (host === base || host.endsWith(`.${base}`)) return;
    } catch {
      /* fallthrough */
    }
    throw Errors.forbidden("Cross-origin request rejected");
  }
}

// ---------------------------------------------------------------------------
// Handler wrappers
// ---------------------------------------------------------------------------

type RouteContext<P> = { params: Promise<P> };

type PublicHandler<P> = (req: NextRequest, ctx: { params: P }) => Promise<Response>;
type AuthedHandler<P> = (req: NextRequest, ctx: { params: P; auth: AuthContext }) => Promise<Response>;

function mapUnknownError(err: unknown): AppError {
  if (isAppError(err)) return err;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return Errors.conflict("A record with the same unique value already exists");
    if (err.code === "P2025") return Errors.notFound();
    if (err.code === "P2003") return Errors.conflict("Related record does not exist or is still referenced");
  }
  console.error("Unhandled error in route handler", err);
  return new AppError("INTERNAL_ERROR", 500, "Internal server error");
}

/** Wrap a public route handler: consistent error envelope, origin check on mutations. */
export function publicRoute<P = Record<string, never>>(handler: PublicHandler<P>) {
  return async (req: NextRequest, context: RouteContext<P>): Promise<Response> => {
    try {
      assertTrustedOrigin(req);
      const params = await context.params;
      return await handler(req, { params });
    } catch (err) {
      return errorResponse(mapUnknownError(err));
    }
  };
}

/** Wrap a protected route handler: requires a valid session, provides AuthContext. */
export function authedRoute<P = Record<string, never>>(handler: AuthedHandler<P>) {
  return async (req: NextRequest, context: RouteContext<P>): Promise<Response> => {
    try {
      assertTrustedOrigin(req);
      const auth = await getAuthContext(req);
      if (!auth) throw Errors.unauthenticated();
      const params = await context.params;
      return await handler(req, { params, auth });
    } catch (err) {
      return errorResponse(mapUnknownError(err));
    }
  };
}
