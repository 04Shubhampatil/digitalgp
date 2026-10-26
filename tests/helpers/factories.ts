import { NextRequest } from "next/server";
import type { AdminUnitLevel, Role } from "@/generated/prisma/enums";
import { DEFAULT_PAGE_KEYS } from "@/config/pages";
import { createSession, hashPassword, validateSessionToken, type AuthContext } from "@/lib/auth";
import { db } from "@/lib/db";

export const PASSWORD = "Test-Password-123";

let counter = 0;
const next = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function createUnit(level: AdminUnitLevel, parentId: string | null, slug = `${level.toLowerCase()}-${next()}`) {
  const created = await db.adminUnit.create({ data: { level, parentId, slug, nameEn: slug, nameMr: slug, path: "pending" } });
  const parentPath = parentId ? (await db.adminUnit.findUniqueOrThrow({ where: { id: parentId } })).path : "/";
  return db.adminUnit.update({ where: { id: created.id }, data: { path: `${parentPath}${created.id}/` } });
}

export async function createTenant(unitId: string, slug = `gp-${next()}`, status: "DRAFT" | "PUBLISHED" | "SUSPENDED" = "PUBLISHED") {
  return db.tenant.create({
    data: {
      unitId,
      slug,
      nameEn: slug,
      nameMr: slug,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      pages: { create: DEFAULT_PAGE_KEYS.map((pageKey) => ({ pageKey })) },
    },
  });
}

export async function createUser(opts: { email?: string; password?: string; status?: "ACTIVE" | "SUSPENDED" } = {}) {
  return db.user.create({
    data: {
      email: opts.email ?? `user-${next()}@test.local`,
      name: "Test User",
      passwordHash: await hashPassword(opts.password ?? PASSWORD),
      status: opts.status ?? "ACTIVE",
    },
  });
}

export async function assign(userId: string, role: Role, unitId: string, modules: { moduleKey: string; canWrite?: boolean }[] = []) {
  return db.roleAssignment.create({
    data: {
      userId,
      role,
      unitId,
      modules: { create: modules.map((m) => ({ moduleKey: m.moduleKey, canWrite: m.canWrite ?? true })) },
    },
  });
}

/** Create a user with one role, log them in, and return their AuthContext + session token. */
export async function actor(role: Role, unitId: string, modules: { moduleKey: string; canWrite?: boolean }[] = []) {
  const user = await createUser();
  await assign(user.id, role, unitId, modules);
  const { token } = await createSession(user.id);
  const ctx = await validateSessionToken(token);
  if (!ctx) throw new Error("failed to build auth context");
  return { user, ctx, token };
}

export async function contextFor(userId: string): Promise<AuthContext> {
  const { token } = await createSession(userId);
  const ctx = await validateSessionToken(token);
  if (!ctx) throw new Error("failed to build auth context");
  return ctx;
}

/**
 * Standard world for isolation tests:
 *   state > district > taluka1 > gpA, gpB   |  taluka2 > gpC
 */
export async function buildWorld() {
  const state = await createUnit("STATE", null);
  const district = await createUnit("DISTRICT", state.id);
  const taluka1 = await createUnit("TALUKA", district.id);
  const taluka2 = await createUnit("TALUKA", district.id);
  const gpA = await createUnit("GRAM_PANCHAYAT", taluka1.id);
  const gpB = await createUnit("GRAM_PANCHAYAT", taluka1.id);
  const gpC = await createUnit("GRAM_PANCHAYAT", taluka2.id);
  const tenantA = await createTenant(gpA.id, "gp-a");
  const tenantB = await createTenant(gpB.id, "gp-b");
  const tenantC = await createTenant(gpC.id, "gp-c");
  return { state, district, taluka1, taluka2, gpA, gpB, gpC, tenantA, tenantB, tenantC };
}

export const client = { ipAddress: "127.0.0.1", userAgent: "vitest" };

/** Build a NextRequest for calling route handlers directly. */
export function request(
  path: string,
  init: { method?: string; body?: unknown; token?: string | null; headers?: Record<string, string> } = {},
) {
  const headers = new Headers(init.headers ?? {});
  if (init.body !== undefined) headers.set("content-type", "application/json");
  if (init.token) headers.set("cookie", `dgp_session=${init.token}`);
  return new NextRequest(`http://localhost:3000${path}`, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

export const params = <P>(p: P) => ({ params: Promise.resolve(p) });
