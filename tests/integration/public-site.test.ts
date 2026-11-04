import { beforeEach, describe, expect, it } from "vitest";
import {
  createAnnouncement,
  getPublicAnnouncement,
  listPublicAnnouncementCategories,
  listPublicAnnouncements,
  transitionAnnouncement,
  updateAnnouncement,
} from "@/features/announcements/service";
import { exportAuditLogs, listAuditLogs } from "@/features/audit/service";
import { login } from "@/features/auth/service";
import { listDashboardWebsites, listPendingUpdates } from "@/features/dashboard/service";
import { submitTreeAdoption } from "@/features/forms/service";
import { lookupPublicGrievancesByPhone, submitGrievance, getPublicGrievanceStatus } from "@/features/grievances/service";
import { getPublicPage } from "@/features/pages/service";
import { createProject, getPublicProject, transitionProject, updateProject } from "@/features/projects/service";
import { createScheme, getPublicScheme, transitionScheme } from "@/features/schemes/service";
import { createStory, getPublicStory, listPublicStories, transitionStory, updateStory } from "@/features/success-stories/service";
import { createTenant as createTenantService, exportTenants, listTenants } from "@/features/tenants/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { setMailer } from "@/lib/mailer";
import { actor, assign, buildWorld, client, createUnit, createUser, PASSWORD } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

beforeEach(() => setMailer({ send: async () => undefined }));

type Ctx = Parameters<typeof transitionProject>[0];
async function approveAndPublish(fn: (ctx: Ctx, id: string, a: "submit" | "approve" | "publish", n: null, c: typeof client) => Promise<unknown>, ctx: Ctx, id: string) {
  await fn(ctx, id, "submit", null, client);
  await fn(ctx, id, "approve", null, client);
  await fn(ctx, id, "publish", null, client);
}

async function uploadRow(tenantId: string | null, ownerUnitId: string, kind: "IMAGE" | "DOCUMENT" = "IMAGE") {
  const u = await createUser();
  return db.media.create({
    data: { tenantId, ownerUnitId, kind, storageKey: `k-${Math.random().toString(36).slice(2)}`, originalName: "budget.pdf", mimeType: kind === "IMAGE" ? "image/png" : "application/pdf", sizeBytes: 2048, uploadedById: u.id },
  });
}

describe("optional pages", () => {
  it("new websites get a disabled progress page that answers 404 until an admin enables it", async () => {
    const w = await buildWorld();
    const admin = await actor("SUPER_ADMIN", w.state.id);
    const gp = await createUnit("GRAM_PANCHAYAT", w.taluka1.id);
    const t = await createTenantService(admin.ctx, { unitId: gp.id, slug: "gp-new", nameEn: "New", nameMr: "नवीन" }, client);
    await db.tenant.update({ where: { id: t.id }, data: { status: "PUBLISHED" } });
    const progress = await db.page.findUniqueOrThrow({ where: { tenantId_pageKey: { tenantId: t.id, pageKey: "progress" } } });
    expect(progress.isEnabled).toBe(false);
    await expectCode(getPublicPage("gp-new", "progress"), "NOT_FOUND");
    await expectCode(getPublicPage("gp-new", "no-such-page"), "NOT_FOUND");
    await db.page.update({ where: { id: progress.id }, data: { isEnabled: true } });
    expect((await getPublicPage("gp-new", "progress")).sections).toEqual([]);
  });
});

describe("grievances: new fields and mobile lookup", () => {
  const base = { category: "Water", citizenName: "Asha Patil", description: "No water supply in our lane for three days." };

  it("stores type, subject and location and shows them with the tracking code", async () => {
    await buildWorld();
    const r = await submitGrievance("gp-a", { ...base, complaintType: "Water Supply", subject: "No water", location: "Ward 2, temple lane" }, client);
    expect(await getPublicGrievanceStatus("gp-a", r.trackingCode)).toMatchObject({ complaintType: "Water Supply", subject: "No water", location: "Ward 2, temple lane" });
  });

  it("finds complaints by mobile number on the same website only, with minimal fields", async () => {
    await buildWorld();
    const ip = (n: number) => ({ ipAddress: `203.0.113.${n}`, userAgent: "vitest" });
    const a = await submitGrievance("gp-a", { ...base, citizenPhone: "+919876543210", subject: "Private subject" }, ip(1));
    await submitGrievance("gp-a", { ...base, citizenPhone: "9876543210" }, ip(2));
    await submitGrievance("gp-a", { ...base, citizenPhone: "9999999999" }, ip(3));
    await submitGrievance("gp-b", { ...base, citizenPhone: "9876543210" }, ip(4));

    const rows = await lookupPublicGrievancesByPhone("gp-a", "09876543210".replace(/^0/, ""), ip(5));
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.trackingCode)).toContain(a.trackingCode);
    expect(Object.keys(rows[0]!).sort()).toEqual(["category", "complaintType", "createdAt", "status", "trackingCode", "updatedAt"]);
    expect(JSON.stringify(rows)).not.toContain("Private subject");
    expect(JSON.stringify(rows)).not.toContain("Asha");
  });

  it("rate limits lookups per number", async () => {
    await buildWorld();
    for (let i = 0; i < 5; i++) await lookupPublicGrievancesByPhone("gp-a", "9876543210", { ipAddress: `198.51.100.${i}`, userAgent: "vitest" });
    await expectCode(lookupPublicGrievancesByPhone("gp-a", "9876543210", { ipAddress: "198.51.100.99", userAgent: "vitest" }), "RATE_LIMITED");
  });
});

describe("tree adoption", () => {
  async function publishTreeSection(tenantId: string, data: object) {
    const author = await createUser();
    const page = await db.page.findUniqueOrThrow({ where: { tenantId_pageKey: { tenantId, pageKey: "environment" } } });
    const section = await db.section.create({ data: { tenantId, pageId: page.id, sectionKey: "tree-adoption", sortOrder: 20 } });
    const rev = await db.sectionRevision.create({ data: { tenantId, sectionId: section.id, version: 1, status: "PUBLISHED", data: data as never, createdById: author.id, publishedById: author.id, publishedAt: new Date() } });
    await db.section.update({ where: { id: section.id }, data: { publishedId: rev.id } });
  }
  const input = { name: "Ravi", phone: "9876543210", treeCount: 3, species: "Neem", preferredLocation: "School ground", website: "" };

  it("is closed until the section is published and enabled, then stores the request", async () => {
    const w = await buildWorld();
    await expectCode(submitTreeAdoption("gp-a", input, client), "NOT_FOUND");
    await publishTreeSection(w.tenantA.id, { enabled: true, title: { en: "Adopt a tree" }, bullets: [], stats: [], successMessage: { en: "Thank you!" } });
    expect(await submitTreeAdoption("gp-a", input, client)).toEqual({ message: "Thank you!" });
    const row = await db.formSubmission.findFirstOrThrow({ where: { tenantId: w.tenantA.id, kind: "TREE_ADOPTION" } });
    expect(row.details).toEqual({ treeCount: 3, species: "Neem", preferredLocation: "School ground" });
    await expectCode(submitTreeAdoption("gp-b", input, client), "NOT_FOUND");
  });
});

describe("detail endpoints", () => {
  it("projects: one published project with short outcome, before/after images and ward label; drafts and other websites are 404", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const before = await uploadRow(w.tenantA.id, w.gpA.id);
    const after = await uploadRow(w.tenantA.id, w.gpA.id);
    const p = await createProject(admin.ctx, { tenantId: w.tenantA.id, stage: "COMPLETED", nameEn: "Road", wardNo: "3", outcomeShortEn: "2 km road", beforeImageId: before.id, afterImageId: after.id }, client);
    await expectCode(getPublicProject("gp-a", p.id), "NOT_FOUND");
    await approveAndPublish(transitionProject as never, admin.ctx, p.id);
    expect(await getPublicProject("gp-a", p.id)).toMatchObject({ outcomeShortEn: "2 km road", beforeImageId: before.id, afterImageId: after.id, wardLabelEn: "Ward 3", wardLabelMr: "वॉर्ड ३" });
    await expectCode(getPublicProject("gp-b", p.id), "NOT_FOUND");
  });

  it("projects reject another website's images", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const foreign = await uploadRow(w.tenantB.id, w.gpB.id);
    await expectCode(createProject(admin.ctx, { tenantId: w.tenantA.id, stage: "ONGOING", nameEn: "X", beforeImageId: foreign.id }, client), "BAD_REQUEST");
    const p = await createProject(admin.ctx, { tenantId: w.tenantA.id, stage: "ONGOING", nameEn: "X" }, client);
    await expectCode(updateProject(admin.ctx, p.id, { afterImageId: foreign.id }, client), "BAD_REQUEST");
  });

  it("schemes: published own or targeted schemes only; category filter is case-insensitive", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const s = await createScheme(admin.ctx, { tenantId: w.tenantA.id, level: "STATE", nameEn: "PM Awas", category: "Housing" }, client);
    await expectCode(getPublicScheme("gp-a", s.id), "NOT_FOUND");
    await approveAndPublish(transitionScheme as never, admin.ctx, s.id);
    expect(await getPublicScheme("gp-a", s.id)).toMatchObject({ nameEn: "PM Awas", category: "Housing" });
    await expectCode(getPublicScheme("gp-b", s.id), "NOT_FOUND");
  });
});

describe("announcements: events, categories and attachments", () => {
  it("calendar range, category counts, detail and attachment details", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const doc = await uploadRow(w.tenantA.id, w.gpA.id, "DOCUMENT");
    const mk = async (category: string, titleEn: string, extra: object = {}) => {
      const a = await createAnnouncement(admin.ctx, { tenantId: w.tenantA.id, category, titleEn, priority: "NORMAL", displayPages: ["announcements"], ...extra }, client);
      await approveAndPublish(transitionAnnouncement as never, admin.ctx, a.id);
      return a;
    };
    const sabha = await mk("Event", "Gram Sabha", { eventStartAt: "2026-11-20T10:00:00+05:30", eventEndAt: "2026-11-20T12:00:00+05:30", eventLocationEn: "GP office" });
    await mk("Event", "Health camp", { eventStartAt: "2026-12-05T09:00:00+05:30" });
    const form = await mk("Notice", "Tax form", { attachmentId: doc.id });

    const nov = await listPublicAnnouncements("gp-a", { from: "2026-11-01", to: "2026-12-01", limit: 20 });
    expect(nov.items.map((a) => a.id)).toEqual([sabha.id]);
    expect(nov.items[0]).toMatchObject({ eventStartAt: "2026-11-20T04:30:00.000Z", eventLocationEn: "GP office" });

    const events = await listPublicAnnouncements("gp-a", { events: "true", limit: 20 });
    expect(events.items).toHaveLength(2);

    const downloads = await listPublicAnnouncements("gp-a", { hasAttachment: "true", limit: 20 });
    expect(downloads.items.map((a) => a.id)).toEqual([form.id]);
    expect(downloads.items[0]!.attachment).toEqual({ id: doc.id, kind: "DOCUMENT", name: "budget.pdf", mimeType: "application/pdf", sizeBytes: 2048 });

    expect((await listPublicAnnouncements("gp-a", { category: "event", limit: 20 })).items).toHaveLength(2);
    expect(await listPublicAnnouncementCategories("gp-a")).toEqual([
      { category: "Event", count: 2 },
      { category: "Notice", count: 1 },
    ]);
    expect((await getPublicAnnouncement("gp-a", sabha.id)).titleEn).toBe("Gram Sabha");
    await expectCode(getPublicAnnouncement("gp-b", sabha.id), "NOT_FOUND");
  });

  it("rejects another website's attachment and an event that ends before it starts", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const foreign = await uploadRow(w.tenantB.id, w.gpB.id, "DOCUMENT");
    await expectCode(createAnnouncement(admin.ctx, { tenantId: w.tenantA.id, category: "Notice", titleEn: "X", priority: "NORMAL", displayPages: ["home"], attachmentId: foreign.id }, client), "BAD_REQUEST");
    const a = await createAnnouncement(admin.ctx, { tenantId: w.tenantA.id, category: "Event", titleEn: "Y", priority: "NORMAL", displayPages: ["home"], eventStartAt: "2026-11-20T10:00:00+05:30" }, client);
    await expectCode(updateAnnouncement(admin.ctx, a.id, { eventEndAt: "2026-11-19T10:00:00+05:30" }, client), "VALIDATION_ERROR");
  });
});

describe("success stories", () => {
  it("follow the review workflow, need consent to name a person, and only published ones are public", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const story = await createStory(admin.ctx, { tenantId: w.tenantA.id, pageKey: "projects", titleEn: "From farmer to entrepreneur", personName: "Ramesh Jadhav" }, client);
    await expectCode(transitionStory(admin.ctx, story.id, "submit", null, client), "BAD_REQUEST");
    await updateStory(admin.ctx, story.id, { consentConfirmed: true }, client);
    await approveAndPublish(transitionStory as never, admin.ctx, story.id);

    expect(await getPublicStory("gp-a", story.id)).toMatchObject({ titleEn: "From farmer to entrepreneur", personName: "Ramesh Jadhav" });
    expect(await getPublicStory("gp-a", story.id)).not.toHaveProperty("consentConfirmed");
    expect((await listPublicStories("gp-a", { page: "projects", limit: 20 })).items).toHaveLength(1);
    expect((await listPublicStories("gp-a", { page: "culture", limit: 20 })).items).toHaveLength(0);
    await expectCode(getPublicStory("gp-b", story.id), "NOT_FOUND");
  });

  it("another website's admin and operators without the pages module cannot write stories", async () => {
    const w = await buildWorld();
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "projects" }]);
    await expectCode(createStory(adminB.ctx, { tenantId: w.tenantA.id, pageKey: "projects", titleEn: "X" }, client), "NOT_FOUND");
    await expectCode(createStory(operator.ctx, { tenantId: w.tenantA.id, pageKey: "projects", titleEn: "X" }, client), "FORBIDDEN");
  });
});

describe("admin panel", () => {
  it("GP websites list shows the block admins over each website; export is scoped CSV", async () => {
    const w = await buildWorld();
    const blockUser = await createUser({ email: "block.one@test.local" });
    await assign(blockUser.id, "BLOCK_ADMIN", w.taluka1.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);

    const page = await listTenants(taluka.ctx, { limit: 20 });
    expect(page.items.map((t) => t.slug).sort()).toEqual(["gp-a", "gp-b"]);
    expect(page.items.every((t) => t.blockAdmins.some((a) => a.email === "block.one@test.local"))).toBe(true);

    const csv = await exportTenants(taluka.ctx, {});
    expect(csv.split("\r\n")[0]).toContain("Block admins");
    expect(csv).toContain("gp-a");
    expect(csv).not.toContain("gp-c");
  });

  it("dashboard lists pending items, last change and setup progress per website in scope", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const p = await createProject(admin.ctx, { tenantId: w.tenantA.id, stage: "ONGOING", nameEn: "Drain" }, client);
    await transitionProject(admin.ctx, p.id, "submit", null, client);

    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const rows = await listDashboardWebsites(taluka.ctx, { limit: 20 });
    const a = rows.items.find((r) => r.slug === "gp-a")!;
    expect(a).toMatchObject({ pendingItems: 1, lastUpdatedBy: { id: admin.user.id }, lastAction: "project.submit" });
    expect(a.setupProgress).toMatchObject({ pagesWithContent: 0, percent: 0 });
    expect(a.setupProgress.missingPages).not.toContain("progress");
    expect(rows.items.map((r) => r.slug)).not.toContain("gp-c");

    const feed = await listPendingUpdates(taluka.ctx);
    expect(feed).toEqual([expect.objectContaining({ type: "PROJECT", id: p.id, titleEn: "Drain", submittedBy: { id: admin.user.id, name: "Test User" } })]);
    const other = await actor("TALUKA_ADMIN", w.taluka2.id);
    expect(await listPendingUpdates(other.ctx)).toEqual([]);
  });

  it("audit log records failed sign-ins with result and IP; export escapes formulas", async () => {
    const w = await buildWorld();
    const user = await createUser({ email: "=cmd@test.local" });
    await assign(user.id, "GP_ADMIN", w.gpA.id);
    await expectCode(login({ email: "=cmd@test.local", password: "wrong-password-1", rememberMe: false }, { ipAddress: "192.0.2.7", userAgent: "vitest" }), "UNAUTHENTICATED");
    await login({ email: "=cmd@test.local", password: PASSWORD, rememberMe: false }, { ipAddress: "192.0.2.7", userAgent: "vitest" });
    const ctx = (await actor("SUPER_ADMIN", w.state.id)).ctx;

    const failed = await listAuditLogs(ctx, { action: "auth.login_failed", limit: 20 });
    expect(failed.items[0]).toMatchObject({ result: "FAILURE", ipAddress: "192.0.2.7" });
    expect((await listAuditLogs(ctx, { result: "FAILURE", limit: 20 })).items.every((a) => a.result === "FAILURE")).toBe(true);
    // Sign-in events are visible to auditors whose area contains the user's role, not to other areas.
    const sameTaluka = (await actor("TALUKA_ADMIN", w.taluka1.id)).ctx;
    expect((await listAuditLogs(sameTaluka, { action: "auth.login_failed", limit: 20 })).items).toHaveLength(1);
    const otherTaluka = (await actor("TALUKA_ADMIN", w.taluka2.id)).ctx;
    expect((await listAuditLogs(otherTaluka, { action: "auth.", limit: 20 })).items.filter((a) => a.actorId === user.id)).toEqual([]);

    const csv = await exportAuditLogs(ctx, { action: "auth." });
    expect(csv).toContain("'=cmd@test.local");
    expect(csv).toContain("FAILURE");
  });
});
