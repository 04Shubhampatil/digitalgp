import { describe, expect, it } from "vitest";
import { login, logout, requestPasswordReset, resetPassword } from "@/features/auth/service";
import { createSession, hashToken, validateSessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { setMailer } from "@/lib/mailer";
import { PASSWORD, buildWorld, client, createUser, actor } from "../helpers/factories";

const rejectsWith = async (p: Promise<unknown>, code: string, status?: number) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code && (status === undefined || e.status === status));
};

describe("login", () => {
  it("creates a session for valid credentials and records an audit event", async () => {
    const user = await createUser({ email: "a@test.local" });
    const session = await login({ email: "A@test.local", password: PASSWORD, rememberMe: false }, client);
    expect(session.token).toHaveLength(43);
    const ctx = await validateSessionToken(session.token);
    expect(ctx?.user.id).toBe(user.id);
    const audit = await db.auditLog.findFirst({ where: { action: "auth.login", actorId: user.id } });
    expect(audit).not.toBeNull();
  });

  it("rejects a wrong password and an unknown email with the same error", async () => {
    await createUser({ email: "b@test.local" });
    await rejectsWith(login({ email: "b@test.local", password: "wrong-password-1", rememberMe: false }, client), "UNAUTHENTICATED", 401);
    await rejectsWith(login({ email: "nobody@test.local", password: PASSWORD, rememberMe: false }, client), "UNAUTHENTICATED", 401);
  });

  it("rejects suspended users", async () => {
    await createUser({ email: "s@test.local", status: "SUSPENDED" });
    await rejectsWith(login({ email: "s@test.local", password: PASSWORD, rememberMe: false }, client), "FORBIDDEN", 403);
  });

  it("rate limits repeated failures per email", async () => {
    await createUser({ email: "r@test.local" });
    for (let i = 0; i < 5; i++) {
      await rejectsWith(login({ email: "r@test.local", password: "bad-password-1", rememberMe: false }, client), "UNAUTHENTICATED");
    }
    // 6th attempt is blocked even with the correct password.
    await rejectsWith(login({ email: "r@test.local", password: PASSWORD, rememberMe: false }, client), "RATE_LIMITED", 429);
  });
});

describe("sessions", () => {
  it("expired sessions are rejected and deleted", async () => {
    const user = await createUser();
    const { token } = await createSession(user.id);
    await db.session.update({ where: { id: hashToken(token) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await db.session.findUnique({ where: { id: hashToken(token) } })).toBeNull();
  });

  it("sessions of a suspended user stop working immediately", async () => {
    const user = await createUser();
    const { token } = await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("logout revokes the session; the raw token is never stored", async () => {
    const world = await buildWorld();
    const { ctx, token } = await actor("GP_ADMIN", world.gpA.id);
    expect(await db.session.findUnique({ where: { id: token } })).toBeNull();
    expect(await db.session.findUnique({ where: { id: hashToken(token) } })).not.toBeNull();
    await logout(ctx, token, client);
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("garbage tokens are rejected", async () => {
    expect(await validateSessionToken("not-a-real-token")).toBeNull();
  });
});

describe("password reset", () => {
  it("issues a single-use token, replaces the password and revokes sessions", async () => {
    const sent: string[] = [];
    setMailer({ send: async (m) => void sent.push(m.text) });
    const user = await createUser({ email: "reset@test.local" });
    const { token: sessionToken } = await createSession(user.id);

    await requestPasswordReset("reset@test.local", client);
    await requestPasswordReset("unknown@test.local", client); // silent
    expect(sent).toHaveLength(1);
    const resetToken = decodeURIComponent(new URL(sent[0]!.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!);

    await resetPassword(resetToken, "Brand-New-Pass-99", client);
    expect(await validateSessionToken(sessionToken)).toBeNull();
    await expect(login({ email: "reset@test.local", password: "Brand-New-Pass-99", rememberMe: false }, client)).resolves.toBeTruthy();
    await rejectsWith(resetPassword(resetToken, "Another-Pass-99", client), "BAD_REQUEST", 400);
  });
});
