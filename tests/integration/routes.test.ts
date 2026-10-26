import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as getTenant, PATCH as patchTenant } from "@/app/api/v1/tenants/[tenantId]/route";
import { GET as listTenants } from "@/app/api/v1/tenants/route";
import { POST as createAnnouncement } from "@/app/api/v1/announcements/route";
import { POST as transition } from "@/app/api/v1/announcements/[announcementId]/[action]/route";
import { GET as publicAnnouncements } from "@/app/api/v1/public/[tenantSlug]/announcements/route";
import { GET as health } from "@/app/api/health/route";
import { PASSWORD, actor, buildWorld, createUser, params, request } from "../helpers/factories";

const json = async (res: Response) => ({ status: res.status, body: (await res.json().catch(() => null)) as never });

describe("route handlers", () => {
  it("health reports db status", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok", db: "ok" });
  });

  it("login validates input and sets an httpOnly cookie on success", async () => {
    await createUser({ email: "route@test.local" });
    const bad = await json(await login(request("/api/v1/auth/login", { body: { email: "not-an-email", password: "" } }), params({})));
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });

    const res = await login(request("/api/v1/auth/login", { body: { email: "route@test.local", password: PASSWORD } }), params({}));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/dgp_session=/);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=lax");

    const token = /dgp_session=([^;]+)/.exec(cookie)![1]!;
    const meRes = await json(await me(request("/api/v1/auth/me", { token }), params({})));
    expect(meRes.status).toBe(200);
    expect(meRes.body).toMatchObject({ data: { user: { email: "route@test.local" } } });
    expect(JSON.stringify(meRes.body)).not.toContain("passwordHash");

    const out = await logout(request("/api/v1/auth/logout", { method: "POST", token }), params({}));
    expect(out.status).toBe(204);
    expect((await json(await me(request("/api/v1/auth/me", { token }), params({})))).status).toBe(401);
  });

  it("protected routes return 401 without a session and 404 outside scope", async () => {
    const w = await buildWorld();
    const { token } = await actor("GP_ADMIN", w.gpA.id);

    expect((await json(await listTenants(request("/api/v1/tenants"), params({})))).status).toBe(401);
    expect((await json(await listTenants(request("/api/v1/tenants", { token: "bogus" }), params({})))).status).toBe(401);

    const own = await json(await getTenant(request(`/api/v1/tenants/${w.tenantA.id}`, { token }), params({ tenantId: w.tenantA.id })));
    expect(own.status).toBe(200);
    const other = await json(await getTenant(request(`/api/v1/tenants/${w.tenantB.id}`, { token }), params({ tenantId: w.tenantB.id })));
    expect(other.status).toBe(404);
    expect(other.body).toMatchObject({ error: { code: "NOT_FOUND" } });

    const patched = await json(await patchTenant(request(`/api/v1/tenants/${w.tenantB.id}`, { method: "PATCH", body: { nameEn: "x" }, token }), params({ tenantId: w.tenantB.id })));
    expect(patched.status).toBe(404);
  });

  it("rejects cross-origin mutations and bad JSON", async () => {
    const w = await buildWorld();
    const { token } = await actor("GP_ADMIN", w.gpA.id);
    const csrf = await json(
      await createAnnouncement(request("/api/v1/announcements", { body: { tenantId: w.tenantA.id, category: "x", titleEn: "x" }, token, headers: { origin: "https://evil.example" } }), params({})),
    );
    expect(csrf.status).toBe(403);
    const badJson = await createAnnouncement(
      request("/api/v1/announcements", { method: "POST", token, headers: { "content-type": "application/json" } }),
      params({}),
    );
    expect(badJson.status).toBe(400);
  });

  it("workflow actions are routed and unknown actions are 404", async () => {
    const w = await buildWorld();
    const { token } = await actor("GP_ADMIN", w.gpA.id);
    const createdRes = await json(await createAnnouncement(request("/api/v1/announcements", { body: { tenantId: w.tenantA.id, category: "notice", titleEn: "Hello" }, token }), params({})));
    expect(createdRes.status).toBe(201);
    const id = (createdRes.body as { data: { id: string } }).data.id;

    const unknown = await transition(request(`/api/v1/announcements/${id}/explode`, { method: "POST", token }), params({ announcementId: id, action: "explode" }));
    expect(unknown.status).toBe(404);
    const submitted = await json(await transition(request(`/api/v1/announcements/${id}/submit`, { method: "POST", token }), params({ announcementId: id, action: "submit" })));
    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({ data: { status: "SUBMITTED" } });
    const rejected = await json(await transition(request(`/api/v1/announcements/${id}/reject`, { body: { note: "" }, token }), params({ announcementId: id, action: "reject" })));
    expect(rejected.status).toBe(400);
  });

  it("public endpoint validates query params and needs no session", async () => {
    await buildWorld();
    const ok = await json(await publicAnnouncements(request("/api/v1/public/gp-a/announcements?limit=5"), params({ tenantSlug: "gp-a" })));
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ data: [], page: { nextCursor: null, limit: 5 } });
    const bad = await json(await publicAnnouncements(request("/api/v1/public/gp-a/announcements?limit=500"), params({ tenantSlug: "gp-a" })));
    expect(bad.status).toBe(400);
  });
});
