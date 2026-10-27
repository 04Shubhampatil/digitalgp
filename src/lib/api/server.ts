import "server-only";

import { cookies } from "next/headers";
import { apiFetch, apiFetchPage, type ApiRequest } from "./client";

/** Serialise the incoming request's cookies so the backend sees the admin session. */
export async function cookieHeader(): Promise<string> {
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/** `apiFetch` for Server Components / Server Actions: forwards the session cookie. */
export async function serverApi<T>(path: string, req: Omit<ApiRequest, "cookie"> = {}): Promise<T> {
  return apiFetch<T>(path, { ...req, cookie: await cookieHeader() });
}

export async function serverApiPage<T>(path: string, req: Omit<ApiRequest, "cookie"> = {}) {
  return apiFetchPage<T>(path, { ...req, cookie: await cookieHeader() });
}
