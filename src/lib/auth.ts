import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import type { NextRequest, NextResponse } from "next/server";
import type { AdminUnitLevel, Role, UserStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { getEnv, isProduction } from "@/lib/env";

// ---------------------------------------------------------------------------
// Passwords (Argon2id via @node-rs/argon2 — no custom cryptography)
// ---------------------------------------------------------------------------

const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const; // OWASP 2024 baseline

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON_OPTIONS);
}

export async function verifyPassword(hashed: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hashed, password);
  } catch {
    return false;
  }
}

/** Constant-cost dummy verification so login timing does not reveal whether an email exists. */
let dummyHashPromise: Promise<string> | undefined;
export async function burnPasswordVerification(): Promise<void> {
  dummyHashPromise ??= hashPassword(randomBytes(16).toString("hex"));
  await argonVerify(await dummyHashPromise, "not-the-password").catch(() => false);
}

// ---------------------------------------------------------------------------
// Opaque tokens
// ---------------------------------------------------------------------------

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
export const SESSION_TTL_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; // 30d

export interface CreateSessionOptions {
  rememberMe?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createSession(userId: string, opts: CreateSessionOptions = {}) {
  const token = generateToken();
  const ttl = opts.rememberMe ? SESSION_TTL_REMEMBER_MS : SESSION_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl);
  await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent?.slice(0, 512) ?? null,
    },
  });
  return { token, expiresAt };
}

export async function revokeSession(token: string): Promise<void> {
  await db.session.deleteMany({ where: { id: hashToken(token) } });
}

export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await db.session.deleteMany({ where: { userId } });
  return result.count;
}

export async function deleteExpiredSessions(): Promise<number> {
  const result = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

export interface AuthAssignment {
  id: string;
  role: Role;
  unitId: string;
  unitLevel: AdminUnitLevel;
  /** Materialized path of the scope root; targets whose path starts with this are in scope. */
  unitPath: string;
  /** moduleKey -> canWrite. Only populated for DATA_ENTRY_OPERATOR. */
  modules: ReadonlyMap<string, boolean>;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  locale: "EN" | "MR" | "HI";
  mustResetPassword: boolean;
}

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
  assignments: AuthAssignment[];
}

/**
 * Validate a raw session token. Returns null when missing, expired, or the user is suspended.
 * Sliding expiry: the session is extended when less than half of its lifetime remains.
 */
export async function validateSessionToken(token: string): Promise<AuthContext | null> {
  const sessionId = hashToken(token);
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: {
      user: {
        include: {
          roleAssignments: {
            where: { revokedAt: null },
            include: { unit: { select: { id: true, level: true, path: true } }, modules: true },
          },
        },
      },
    },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => undefined);
    return null;
  }
  if (session.user.status !== "ACTIVE") {
    await db.session.deleteMany({ where: { userId: session.userId } }).catch(() => undefined);
    return null;
  }

  const total = session.expiresAt.getTime() - session.createdAt.getTime();
  if (session.expiresAt.getTime() - now < total / 2) {
    await db.session.update({
      where: { id: sessionId },
      data: { expiresAt: new Date(now + total), lastSeenAt: new Date() },
    });
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      status: session.user.status,
      locale: session.user.locale,
      mustResetPassword: session.user.mustResetPassword,
    },
    sessionId,
    assignments: session.user.roleAssignments.map((a) => ({
      id: a.id,
      role: a.role,
      unitId: a.unitId,
      unitLevel: a.unit.level,
      unitPath: a.unit.path,
      modules: new Map(a.modules.map((m) => [m.moduleKey, m.canWrite])),
    })),
  };
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

export function getSessionCookieName() {
  return getEnv().SESSION_COOKIE_NAME;
}

export function readSessionToken(req: NextRequest): string | null {
  return req.cookies.get(getSessionCookieName())?.value ?? null;
}

export function setSessionCookie(res: NextResponse, token: string, expiresAt: Date) {
  res.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Resolve the AuthContext for a request from its session cookie, or null. */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const token = readSessionToken(req);
  if (!token) return null;
  return validateSessionToken(token);
}
