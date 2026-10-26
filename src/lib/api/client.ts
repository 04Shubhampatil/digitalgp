import type { ApiErrorBody, ApiPaginated, ApiSuccess, ErrorCode, ValidationIssue } from "@/types/api";

/**
 * Thin fetch wrapper around the backend contract (docs/api-contract.md):
 *  - success `{ data }` is unwrapped
 *  - errors `{ error: { code, message, details } }` become `ApiError`
 *  - `204` resolves to `undefined`
 *
 * Works in Server Components (pass `cookie` from `next/headers`) and in the browser
 * (same-origin, cookies sent automatically). Never import backend `lib/` or `features/` here.
 */

export const API_BASE = "/api/v1";

export class ApiError extends Error {
  readonly code: ErrorCode | "NETWORK_ERROR";
  readonly status: number;
  readonly details: unknown;

  constructor(code: ErrorCode | "NETWORK_ERROR", status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Field-level issues for `VALIDATION_ERROR`, otherwise an empty list. */
  get issues(): ValidationIssue[] {
    if (this.code !== "VALIDATION_ERROR" || !Array.isArray(this.details)) return [];
    return this.details.filter(
      (d): d is ValidationIssue => typeof d === "object" && d !== null && "path" in d && "message" in d,
    );
  }

  /** Seconds to wait for `RATE_LIMITED`, when the server said so. */
  get retryAfterSeconds(): number | null {
    const d = this.details as { retryAfterSeconds?: unknown } | null;
    return d && typeof d.retryAfterSeconds === "number" ? d.retryAfterSeconds : null;
  }
}

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** JSON body (objects) or FormData for uploads. */
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Forwarded `Cookie` header when called from a Server Component / Route. */
  cookie?: string | null;
  /** Next.js fetch cache options; defaults to `no-store` because every response is user- or tenant-scoped. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  signal?: AbortSignal;
}

function baseUrl(): string {
  if (typeof window !== "undefined") return API_BASE;
  const origin = process.env.API_ORIGIN ?? process.env.APP_ORIGIN ?? "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}${API_BASE}`;
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function apiFetch<T>(path: string, req: ApiRequest = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;

  if (req.body instanceof FormData) {
    body = req.body;
  } else if (req.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(req.body);
  }
  if (req.cookie) headers.Cookie = req.cookie;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, req.query), {
      method: req.method ?? "GET",
      headers,
      body,
      credentials: "same-origin",
      cache: req.cache ?? (req.next ? undefined : "no-store"),
      next: req.next,
      signal: req.signal,
    });
  } catch (err) {
    throw new ApiError("NETWORK_ERROR", 0, err instanceof Error ? err.message : "Network error");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError("INTERNAL_ERROR", res.status, "Invalid JSON response");
    }
  }

  if (!res.ok) {
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? "INTERNAL_ERROR", res.status, err?.message ?? res.statusText, err?.details);
  }

  return (json as ApiSuccess<T>).data;
}

/** Like `apiFetch` but keeps the pagination envelope. */
export async function apiFetchPage<T>(path: string, req: ApiRequest = {}): Promise<ApiPaginated<T>> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (req.cookie) headers.Cookie = req.cookie;
  let res: Response;
  try {
    res = await fetch(buildUrl(path, req.query), {
      method: "GET",
      headers,
      credentials: "same-origin",
      cache: req.cache ?? "no-store",
      signal: req.signal,
    });
  } catch (err) {
    throw new ApiError("NETWORK_ERROR", 0, err instanceof Error ? err.message : "Network error");
  }
  const json = (await res.json().catch(() => null)) as ApiPaginated<T> | ApiErrorBody | null;
  if (!res.ok || !json || !("data" in json)) {
    const err = (json as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? "INTERNAL_ERROR", res.status, err?.message ?? res.statusText, err?.details);
  }
  return json;
}

export function isApiError(err: unknown, code?: ErrorCode | "NETWORK_ERROR"): err is ApiError {
  return err instanceof ApiError && (code === undefined || err.code === code);
}
