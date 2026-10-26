import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, apiFetchPage, buildUrl } from "./client";

function mockFetch(status: number, body: unknown) {
  const text = body === undefined ? null : JSON.stringify(body);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(text, { status, headers: { "Content-Type": "application/json" } })),
  );
}

async function rejection(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("expected the promise to reject");
}

afterEach(() => vi.unstubAllGlobals());

describe("buildUrl", () => {
  it("prefixes /api/v1 and drops empty query values", () => {
    const url = buildUrl("/tenants", { q: "", status: "DRAFT", limit: 20, cursor: undefined });
    expect(url).toMatch(/\/api\/v1\/tenants\?status=DRAFT&limit=20$/);
  });
});

describe("apiFetch", () => {
  it("unwraps { data }", async () => {
    mockFetch(200, { data: { id: "t1" } });
    await expect(apiFetch<{ id: string }>("/tenants/t1")).resolves.toEqual({ id: "t1" });
  });

  it("returns undefined on 204", async () => {
    mockFetch(204, undefined);
    await expect(apiFetch("/auth/logout", { method: "POST" })).resolves.toBeUndefined();
  });

  it("throws ApiError with code, status and validation issues", async () => {
    mockFetch(400, {
      error: { code: "VALIDATION_ERROR", message: "Invalid", details: [{ path: "email", message: "Required" }] },
    });
    const err = await rejection(apiFetch("/auth/login", { method: "POST", body: {} }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.status).toBe(400);
    expect(err.issues).toEqual([{ path: "email", message: "Required" }]);
  });

  it("exposes retryAfterSeconds for RATE_LIMITED", async () => {
    mockFetch(429, { error: { code: "RATE_LIMITED", message: "Slow down", details: { retryAfterSeconds: 42 } } });
    const err = await rejection(apiFetch("/auth/login", { method: "POST", body: {} }));
    expect(err.retryAfterSeconds).toBe(42);
  });

  it("maps fetch failures to NETWORK_ERROR", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const err = await rejection(apiFetch("/auth/me"));
    expect(err.code).toBe("NETWORK_ERROR");
    expect(err.status).toBe(0);
  });
});

describe("apiFetchPage", () => {
  it("keeps the pagination envelope", async () => {
    mockFetch(200, { data: [{ id: 1 }], page: { nextCursor: "abc", limit: 20 } });
    const page = await apiFetchPage<{ id: number }>("/tenants");
    expect(page.page.nextCursor).toBe("abc");
    expect(page.data).toHaveLength(1);
  });
});
