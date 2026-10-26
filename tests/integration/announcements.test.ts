import { describe, expect, it } from "vitest";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  listPublicAnnouncements,
  transitionAnnouncement,
  updateAnnouncement,
} from "@/features/announcements/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const draft = (tenantId: string, titleEn = "Gram Sabha") => ({ tenantId, category: "meeting", priority: "NORMAL" as const, titleEn, displayPages: ["home" as const, "announcements" as const] });

describe("announcement workflow", () => {
  it("operator drafts and submits; admin reviews, approves and publishes; audit trail recorded", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);

    const a = await createAnnouncement(operator.ctx, draft(w.tenantA.id), client);
    expect(a.status).toBe("DRAFT");
    const submitted = await transitionAnnouncement(operator.ctx, a.id, "submit", null, client);
    expect(submitted.status).toBe("SUBMITTED");
    expect(submitted.submittedAt).not.toBeNull();

    // Operators can neither review nor publish.
    await expectCode(transitionAnnouncement(operator.ctx, a.id, "approve", null, client), "FORBIDDEN");
    await expectCode(transitionAnnouncement(operator.ctx, a.id, "publish", null, client), "FORBIDDEN");
    // Submitted content is frozen for editing.
    await expectCode(updateAnnouncement(operator.ctx, a.id, { titleEn: "late edit" }, client), "CONFLICT");

    const reviewing = await transitionAnnouncement(admin.ctx, a.id, "start_review", null, client);
    expect(reviewing.status).toBe("UNDER_REVIEW");
    const approved = await transitionAnnouncement(admin.ctx, a.id, "approve", null, client);
    expect(approved.status).toBe("APPROVED");
    expect(approved.reviewedById).toBe(admin.user.id);
    // Publishing is a separate step and cannot be skipped.
    await expectCode(transitionAnnouncement(admin.ctx, a.id, "publish", null, { ...client }).then(() => transitionAnnouncement(admin.ctx, a.id, "publish", null, client)), "INVALID_TRANSITION");

    const row = await db.announcement.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.status).toBe("PUBLISHED");
    expect(row.publishedById).toBe(admin.user.id);

    const actions = (await db.auditLog.findMany({ where: { entityId: a.id }, orderBy: { createdAt: "asc" } })).map((l) => l.action);
    expect(actions).toEqual([
      "announcement.create",
      "announcement.submit",
      "announcement.start_review",
      "announcement.approve",
      "announcement.publish",
    ]);
  });

  it("rejection needs a note, returns the item to the author, and editing reopens it as a draft", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const a = await createAnnouncement(operator.ctx, draft(w.tenantA.id), client);
    await transitionAnnouncement(operator.ctx, a.id, "submit", null, client);

    await expectCode(transitionAnnouncement(admin.ctx, a.id, "reject", "", client), "BAD_REQUEST");
    const rejected = await transitionAnnouncement(admin.ctx, a.id, "reject", "Add the Marathi title", client);
    expect(rejected).toMatchObject({ status: "REJECTED", reviewNote: "Add the Marathi title" });

    const edited = await updateAnnouncement(operator.ctx, a.id, { titleMr: "ग्रामसभा" }, client);
    expect(edited.status).toBe("DRAFT");
    expect(edited.reviewNote).toBeNull();
    expect((await transitionAnnouncement(operator.ctx, a.id, "submit", null, client)).status).toBe("SUBMITTED");
  });

  it("invalid transitions are refused with 409", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const a = await createAnnouncement(admin.ctx, draft(w.tenantA.id), client);
    await expectCode(transitionAnnouncement(admin.ctx, a.id, "publish", null, client), "INVALID_TRANSITION");
    await expectCode(transitionAnnouncement(admin.ctx, a.id, "approve", null, client), "INVALID_TRANSITION");
  });

  it("operators are limited to their granted modules and write permission", async () => {
    const w = await buildWorld();
    const noModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "projects" }]);
    const readOnly = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements", canWrite: false }]);
    await expectCode(createAnnouncement(noModule.ctx, draft(w.tenantA.id), client), "FORBIDDEN");
    await expectCode(createAnnouncement(readOnly.ctx, draft(w.tenantA.id), client), "FORBIDDEN");
    // Read-only operators can still list.
    expect((await listAnnouncements(readOnly.ctx, { limit: 10 })).items).toEqual([]);
  });

  it("operators cannot create shared announcements; admins must target their own area", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const gpAdmin = await actor("GP_ADMIN", w.gpA.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);

    await expectCode(createAnnouncement(operator.ctx, { ...draft(w.tenantA.id), tenantId: undefined, ownerUnitId: w.taluka1.id, targetUnitIds: [w.gpA.id] }, client), "NOT_FOUND");
    await expectCode(createAnnouncement(gpAdmin.ctx, { ...draft(w.tenantA.id), tenantId: undefined, ownerUnitId: w.gpA.id, targetUnitIds: [w.gpA.id] }, client), "BAD_REQUEST");
    // Target outside the owner's subtree is refused.
    await expectCode(createAnnouncement(taluka.ctx, { ...draft(w.tenantA.id), tenantId: undefined, ownerUnitId: w.taluka1.id, targetUnitIds: [w.gpC.id] }, client), "BAD_REQUEST");
  });
});

describe("public visibility", () => {
  it("shows only published, current content of the tenant plus shared content explicitly targeted at it", async () => {
    const w = await buildWorld();
    const adminA = await actor("GP_ADMIN", w.gpA.id);
    const taluka = await actor("TALUKA_ADMIN", w.taluka1.id);
    const superAdmin = await actor("SUPER_ADMIN", w.state.id);

    const publish = async (ctx: typeof adminA.ctx, id: string) => {
      await transitionAnnouncement(ctx, id, "submit", null, client);
      await transitionAnnouncement(ctx, id, "approve", null, client);
      await transitionAnnouncement(ctx, id, "publish", null, client);
    };

    const own = await createAnnouncement(adminA.ctx, draft(w.tenantA.id, "Own published"), client);
    await publish(adminA.ctx, own.id);
    await createAnnouncement(adminA.ctx, draft(w.tenantA.id, "Own draft"), client);

    const expired = await createAnnouncement(adminA.ctx, { ...draft(w.tenantA.id, "Expired"), expiresAt: new Date(Date.now() + 60_000).toISOString() }, client);
    await publish(adminA.ctx, expired.id);
    await db.announcement.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    const scheduled = await createAnnouncement(adminA.ctx, { ...draft(w.tenantA.id, "Scheduled"), publishAt: new Date(Date.now() + 3_600_000).toISOString() }, client);
    await publish(adminA.ctx, scheduled.id);

    // Shared by the taluka to gpB only — must not appear on gpA.
    const sharedToB = await createAnnouncement(taluka.ctx, { ...draft(w.tenantA.id, "Taluka to B"), tenantId: undefined, ownerUnitId: w.taluka1.id, targetUnitIds: [w.gpB.id] }, client);
    await publish(taluka.ctx, sharedToB.id);
    // Shared by the taluka to the whole taluka — appears on gpA and gpB, not gpC.
    const sharedToTaluka = await createAnnouncement(taluka.ctx, { ...draft(w.tenantA.id, "Taluka wide"), tenantId: undefined, ownerUnitId: w.taluka1.id, targetUnitIds: [w.taluka1.id] }, client);
    await publish(taluka.ctx, sharedToTaluka.id);
    // Shared by super admin to the district but NOT published yet — invisible everywhere.
    await createAnnouncement(superAdmin.ctx, { ...draft(w.tenantA.id, "District draft"), tenantId: undefined, ownerUnitId: w.district.id, targetUnitIds: [w.district.id] }, client);

    const titles = async (slug: string) => (await listPublicAnnouncements(slug, { limit: 50 })).items.map((i) => i.titleEn).sort();
    expect(await titles("gp-a")).toEqual(["Own published", "Taluka wide"]);
    expect(await titles("gp-b")).toEqual(["Taluka to B", "Taluka wide"]);
    expect(await titles("gp-c")).toEqual([]);

    const onA = (await listPublicAnnouncements("gp-a", { limit: 50 })).items;
    expect(onA.find((i) => i.titleEn === "Taluka wide")?.isShared).toBe(true);
    expect(Object.keys(onA[0]!)).not.toContain("createdById");

    await expectCode(listPublicAnnouncements("no-such-gp", { limit: 10 }), "NOT_FOUND");
  });

  it("filters by display page and paginates with a cursor", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    for (let i = 0; i < 5; i++) {
      const a = await createAnnouncement(admin.ctx, { ...draft(w.tenantA.id, `N${i}`), displayPages: i % 2 ? ["home"] : ["announcements"] }, client);
      await transitionAnnouncement(admin.ctx, a.id, "submit", null, client);
      await transitionAnnouncement(admin.ctx, a.id, "approve", null, client);
      await transitionAnnouncement(admin.ctx, a.id, "publish", null, client);
    }
    const first = await listPublicAnnouncements("gp-a", { limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const second = await listPublicAnnouncements("gp-a", { limit: 2, cursor: first.nextCursor! });
    expect(second.items.map((i) => i.id)).not.toContain(first.items[0]!.id);
    const third = await listPublicAnnouncements("gp-a", { limit: 2, cursor: second.nextCursor! });
    expect(third.items).toHaveLength(1);
    expect(third.nextCursor).toBeNull();

    const home = await listPublicAnnouncements("gp-a", { limit: 10, page: "home" });
    expect(home.items.map((i) => i.titleEn).sort()).toEqual(["N1", "N3"]);
  });

  it("unpublished websites expose nothing publicly", async () => {
    const w = await buildWorld();
    await db.tenant.update({ where: { id: w.tenantA.id }, data: { status: "DRAFT" } });
    await expectCode(listPublicAnnouncements("gp-a", { limit: 10 }), "NOT_FOUND");
  });

  it("deleted announcements disappear; published ones must be unpublished first", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const a = await createAnnouncement(admin.ctx, draft(w.tenantA.id), client);
    await transitionAnnouncement(admin.ctx, a.id, "submit", null, client);
    await transitionAnnouncement(admin.ctx, a.id, "approve", null, client);
    await transitionAnnouncement(admin.ctx, a.id, "publish", null, client);
    await expectCode(deleteAnnouncement(admin.ctx, a.id, client), "CONFLICT");
    await transitionAnnouncement(admin.ctx, a.id, "unpublish", null, client);
    await deleteAnnouncement(admin.ctx, a.id, client);
    expect((await listAnnouncements(admin.ctx, { limit: 10 })).items).toHaveLength(0);
  });
});
