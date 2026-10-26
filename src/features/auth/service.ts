import { writeAudit, actorFromContext } from "@/lib/audit";
import {
  burnPasswordVerification,
  createSession,
  generateToken,
  hashPassword,
  hashToken,
  revokeAllUserSessions,
  revokeSession,
  verifyPassword,
  type AuthContext,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { ROLE_CAPABILITIES } from "@/lib/permissions";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mailer";
import type { AssignmentDto, CurrentUserDto } from "@/types/api";
import { toUserDto, userWithAssignmentsInclude } from "@/features/users/mappers";
import type { LoginInput } from "@/features/auth/validators";

const LOGIN_LIMIT_PER_EMAIL = 5;
const LOGIN_LIMIT_PER_IP = 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const RESET_LIMIT_PER_EMAIL = 3;
const RESET_WINDOW_MS = 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Login / logout
// ---------------------------------------------------------------------------

export async function login(input: LoginInput, client: ClientInfo) {
  const email = input.email.trim().toLowerCase();
  await consumeRateLimit(`login:email:${email}`, LOGIN_LIMIT_PER_EMAIL, LOGIN_WINDOW_MS);
  if (client.ipAddress) await consumeRateLimit(`login:ip:${client.ipAddress}`, LOGIN_LIMIT_PER_IP, LOGIN_WINDOW_MS);

  const user = await db.user.findUnique({
    where: { email },
    omit: { passwordHash: false },
  });

  const valid = user ? await verifyPassword(user.passwordHash, input.password) : (await burnPasswordVerification(), false);

  if (!user || !valid) {
    await writeAudit({ userId: user?.id ?? null, client }, { action: "auth.login_failed", entityType: "User", entityId: user?.id ?? null });
    throw Errors.unauthenticated("Invalid email or password");
  }
  if (user.status !== "ACTIVE") {
    await writeAudit({ userId: user.id, client }, { action: "auth.login_suspended", entityType: "User", entityId: user.id });
    throw Errors.forbidden("This account is suspended");
  }

  const session = await createSession(user.id, {
    rememberMe: input.rememberMe,
    ipAddress: client.ipAddress,
    userAgent: client.userAgent,
  });
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await resetRateLimit(`login:email:${email}`);
  await writeAudit({ userId: user.id, client }, { action: "auth.login", entityType: "User", entityId: user.id });

  return session;
}

export async function logout(ctx: AuthContext, token: string, client: ClientInfo) {
  await revokeSession(token);
  await writeAudit(actorFromContext(ctx, client), { action: "auth.logout", entityType: "User", entityId: ctx.user.id });
}

// ---------------------------------------------------------------------------
// Current user
// ---------------------------------------------------------------------------

export async function getCurrentUser(ctx: AuthContext): Promise<CurrentUserDto> {
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.user.id }, include: userWithAssignmentsInclude });
  const dto = toUserDto(user);
  const capabilities = new Set<string>();
  for (const a of ctx.assignments) for (const c of ROLE_CAPABILITIES[a.role]) capabilities.add(c);
  const { assignments, ...rest } = dto;
  return { user: rest, assignments: assignments as AssignmentDto[], capabilities: [...capabilities].sort() };
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** Always resolves without revealing whether the email exists. */
export async function requestPasswordReset(email: string, client: ClientInfo): Promise<void> {
  await consumeRateLimit(`reset:email:${email}`, RESET_LIMIT_PER_EMAIL, RESET_WINDOW_MS);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;

  const token = generateToken();
  await db.passwordResetToken.create({
    data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });
  const link = `${getEnv().APP_ORIGIN}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to: user.email,
    subject: "DigitalGP — password reset",
    text: `Use this link within 30 minutes to reset your password: ${link}`,
  });
  await writeAudit({ userId: user.id, client }, { action: "auth.reset_requested", entityType: "User", entityId: user.id });
}

export async function resetPassword(token: string, newPassword: string, client: ClientInfo): Promise<void> {
  const id = hashToken(token);
  const record = await db.passwordResetToken.findUnique({ where: { id } });
  if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
    throw Errors.badRequest("This reset link is invalid or has expired");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.$transaction(async (tx) => {
    await tx.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash, mustResetPassword: false } });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await writeAudit({ userId: record.userId, client }, { action: "auth.password_reset", entityType: "User", entityId: record.userId }, tx);
  });
}

export async function changePassword(ctx: AuthContext, currentPassword: string, newPassword: string, client: ClientInfo) {
  const user = await db.user.findUniqueOrThrow({ where: { id: ctx.user.id }, omit: { passwordHash: false } });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw Errors.badRequest("Current password is incorrect");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash, mustResetPassword: false } });
  // Invalidate every other session; the caller's session stays valid.
  await db.session.deleteMany({ where: { userId: user.id, NOT: { id: ctx.sessionId } } });
  await writeAudit(actorFromContext(ctx, client), { action: "auth.password_changed", entityType: "User", entityId: user.id });
}

export { revokeAllUserSessions };
