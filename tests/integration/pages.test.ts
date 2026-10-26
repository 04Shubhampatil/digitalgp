import { describe, expect, it } from "vitest";
import { sectionsForPage } from "@/config/sections";
import {
  discardSectionDraft,
  getPage,
  getPublicPage,
  listPages,
  saveSectionDraft,
  transitionSection,
  updatePage,
} from "@/features/pages/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { actor, buildWorld, client } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const hero = (en = "Welcome to Ganeshwadi") => ({ data: { title: { en, mr: "गणेशवाडीत स्वागत" }, cta: { label: { en: "Contact" }, href: "/contact" } } });

describe("page sections workflow", () => {
  it("registry drives the page shape; operator saves + submits, admin approves + publishes; public serves only published data", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "pages" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);

    const page = await getPage(admin.ctx, w.tenantA.id, "home");
    expect(page.sections.map((s) => s.sectionKey)).toEqual(sectionsForPage("home").map((s) => s.key));
    expect(page.sections.every((s) => s.draft === null && s.published === null)).toBe(true);
    expect((await listPages(admin.ctx, w.tenantA.id)).map((p) => p.pageKey)).toContain("about");

    // Nothing published yet → public page has no sections.
    expect((await getPublicPage("gp-a", "home")).sections).toEqual([]);

    const saved = await saveSectionDraft(operator.ctx, w.tenantA.id, "home", "hero", hero(), client);
    expect(saved.draft).toMatchObject({ version: 1, status: "DRAFT", data: hero().data });
    expect(saved.published).toBeNull();
    // Saving again updates the same draft revision in place.
    const again = await saveSectionDraft(operator.ctx, w.tenantA.id, "home", "hero", hero("v1 edited"), client);
    expect(again.draft).toMatchObject({ id: saved.draft!.id, version: 1 });

    expect((await transitionSection(operator.ctx, w.tenantA.id, "home", "hero", "submit", null, client)).draft?.status).toBe("SUBMITTED");
    await expectCode(saveSectionDraft(operator.ctx, w.tenantA.id, "home", "hero", hero("late"), client), "CONFLICT");
    await expectCode(transitionSection(operator.ctx, w.tenantA.id, "home", "hero", "approve", null, client), "FORBIDDEN");
    await expectCode(transitionSection(operator.ctx, w.tenantA.id, "home", "hero", "publish", null, client), "FORBIDDEN");
    await expectCode(transitionSection(admin.ctx, w.tenantA.id, "home", "hero", "publish", null, client), "INVALID_TRANSITION");

    await transitionSection(admin.ctx, w.tenantA.id, "home", "hero", "approve", null, client);
    const published = await transitionSection(admin.ctx, w.tenantA.id, "home", "hero", "publish", null, client);
    expect(published.draft).toBeNull();
    expect(published.published).toMatchObject({ version: 1, status: "PUBLISHED", publishedById: admin.user.id });

    const pub = await getPublicPage("gp-a", "home");
    expect(pub.sections).toEqual([{ sectionKey: "hero", sortOrder: 0, data: hero("v1 edited").data, publishedAt: expect.any(String) }]);

    // A new draft (version 2) does not change what the public sees until it is published.
    const v2 = await saveSectionDraft(operator.ctx, w.tenantA.id, "home", "hero", hero("v2"), client);
    expect(v2.draft).toMatchObject({ version: 2, status: "DRAFT" });
    expect(v2.published?.version).toBe(1);
    expect((await getPublicPage("gp-a", "home")).sections[0]!.data).toEqual(hero("v1 edited").data);
    await transitionSection(operator.ctx, w.tenantA.id, "home", "hero", "submit", null, client);
    await transitionSection(admin.ctx, w.tenantA.id, "home", "hero", "approve", null, client);
    await transitionSection(admin.ctx, w.tenantA.id, "home", "hero", "publish", null, client);
    expect((await getPublicPage("gp-a", "home")).sections[0]!.data).toEqual(hero("v2").data);
    const revisions = await db.sectionRevision.findMany({ where: { tenantId: w.tenantA.id }, orderBy: { version: "asc" } });
    expect(revisions.map((r) => [r.version, r.status])).toEqual([[1, "ARCHIVED"], [2, "PUBLISHED"]]);

    // Unpublish takes it offline and makes it the draft again.
    const offline = await transitionSection(admin.ctx, w.tenantA.id, "home", "hero", "unpublish", null, client);
    expect(offline.published).toBeNull();
    expect(offline.draft).toMatchObject({ version: 2, status: "APPROVED" });
    expect((await getPublicPage("gp-a", "home")).sections).toEqual([]);

    const actions = (await db.auditLog.findMany({ where: { entityType: "SectionRevision" }, orderBy: { createdAt: "asc" } })).map((a) => a.action);
    expect(actions).toEqual(["section.save", "section.save", "section.submit", "section.approve", "section.publish", "section.save", "section.submit", "section.approve", "section.publish", "section.unpublish"]);
  });

  it("rejection needs a note; editing a rejected draft reopens it; drafts can be discarded", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "pages" }]);
    const admin = await actor("GP_ADMIN", w.gpA.id);
    await saveSectionDraft(operator.ctx, w.tenantA.id, "about", "history", { data: { body: { mr: "इतिहास" } } }, client);
    await transitionSection(operator.ctx, w.tenantA.id, "about", "history", "submit", null, client);
    await expectCode(transitionSection(admin.ctx, w.tenantA.id, "about", "history", "reject", "", client), "BAD_REQUEST");
    const rejected = await transitionSection(admin.ctx, w.tenantA.id, "about", "history", "reject", "Add English", client);
    expect(rejected.draft).toMatchObject({ status: "REJECTED", reviewNote: "Add English" });
    const edited = await saveSectionDraft(operator.ctx, w.tenantA.id, "about", "history", { data: { body: { mr: "इतिहास", en: "History" } } }, client);
    expect(edited.draft).toMatchObject({ status: "DRAFT", reviewNote: null, version: 1 });
    const discarded = await discardSectionDraft(operator.ctx, w.tenantA.id, "about", "history", client);
    expect(discarded.draft).toBeNull();
    await expectCode(discardSectionDraft(operator.ctx, w.tenantA.id, "about", "history", client), "NOT_FOUND");
    expect(await db.sectionRevision.count()).toBe(0);
  });

  it("validates data against the section schema and media ownership; unknown sections are 404", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    await expectCode(saveSectionDraft(admin.ctx, w.tenantA.id, "home", "hero", { data: { title: { en: "x" }, unknown: 1 } }, client), "VALIDATION_ERROR");
    await expectCode(saveSectionDraft(admin.ctx, w.tenantA.id, "home", "hero", { data: { title: { en: "x" }, cta: { label: { en: "Go" }, href: "javascript:alert(1)" } } }, client), "VALIDATION_ERROR");
    await expectCode(saveSectionDraft(admin.ctx, w.tenantA.id, "home", "quick-stats", { data: { items: [] } }, client), "VALIDATION_ERROR");
    await expectCode(saveSectionDraft(admin.ctx, w.tenantA.id, "home", "no-such-section", { data: {} }, client), "NOT_FOUND");
    await expectCode(saveSectionDraft(admin.ctx, w.tenantA.id, "nope", "hero", { data: {} }, client), "NOT_FOUND");
    await expectCode(getPage(admin.ctx, w.tenantA.id, "nope"), "NOT_FOUND");

    const imageB = await db.media.create({
      data: { tenantId: w.tenantB.id, ownerUnitId: w.gpB.id, kind: "IMAGE", storageKey: `${w.tenantB.id}/b.png`, originalName: "b.png", mimeType: "image/png", sizeBytes: 1, uploadedById: adminB.user.id },
    });
    await expectCode(saveSectionDraft(admin.ctx, w.tenantA.id, "home", "hero", { data: { title: { en: "x" }, backgroundImageId: imageB.id } }, client), "BAD_REQUEST");
    await expectCode(saveSectionDraft(admin.ctx, w.tenantA.id, "home", "leaders", { data: { items: [{ name: { en: "A" }, designation: { en: "Sarpanch" }, photoId: imageB.id }] } }, client), "BAD_REQUEST");
    await expectCode(updatePage(admin.ctx, w.tenantA.id, "about", { shareImageId: imageB.id }, client), "BAD_REQUEST");
  });

  it("operators need the pages module; cross-tenant access is a 404", async () => {
    const w = await buildWorld();
    const noModule = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    const readOnly = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "pages", canWrite: false }]);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "pages" }]);

    await expectCode(saveSectionDraft(noModule.ctx, w.tenantA.id, "home", "hero", hero(), client), "FORBIDDEN");
    await expectCode(saveSectionDraft(readOnly.ctx, w.tenantA.id, "home", "hero", hero(), client), "FORBIDDEN");
    expect((await getPage(readOnly.ctx, w.tenantA.id, "home")).pageKey).toBe("home");
    await expectCode(updatePage(operator.ctx, w.tenantA.id, "home", { isEnabled: false }, client), "FORBIDDEN");

    await expectCode(getPage(adminB.ctx, w.tenantA.id, "home"), "NOT_FOUND");
    await expectCode(listPages(adminB.ctx, w.tenantA.id), "NOT_FOUND");
    await expectCode(saveSectionDraft(adminB.ctx, w.tenantA.id, "home", "hero", hero(), client), "NOT_FOUND");
    await expectCode(transitionSection(adminB.ctx, w.tenantA.id, "home", "hero", "submit", null, client), "NOT_FOUND");
    await expectCode(updatePage(adminB.ctx, w.tenantA.id, "home", { isEnabled: false }, client), "NOT_FOUND");
  });

  it("public page honours visibility, the enabled flag and tenant publication", async () => {
    const w = await buildWorld();
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const publish = async (sectionKey: string) => {
      await transitionSection(admin.ctx, w.tenantA.id, "home", sectionKey, "submit", null, client);
      await transitionSection(admin.ctx, w.tenantA.id, "home", sectionKey, "approve", null, client);
      await transitionSection(admin.ctx, w.tenantA.id, "home", sectionKey, "publish", null, client);
    };
    await saveSectionDraft(admin.ctx, w.tenantA.id, "home", "hero", hero(), client);
    await publish("hero");
    await saveSectionDraft(admin.ctx, w.tenantA.id, "home", "quick-links", { data: { items: [{ label: { en: "Schemes" }, href: "/schemes" }] }, isVisible: false, sortOrder: 5 }, client);
    await publish("quick-links");
    await saveSectionDraft(admin.ctx, w.tenantA.id, "home", "welcome", { data: { heading: { en: "Hi" }, body: { en: "Body" } } }, client);

    const pub = await getPublicPage("gp-a", "home");
    expect(pub.sections.map((s) => s.sectionKey)).toEqual(["hero"]);
    expect(JSON.stringify(pub)).not.toContain("Body");

    // Visibility is a section setting; flipping it on exposes the published revision.
    await saveSectionDraft(admin.ctx, w.tenantA.id, "home", "quick-links", { data: { items: [{ label: { en: "Schemes" }, href: "/schemes" }] }, isVisible: true }, client);
    expect((await getPublicPage("gp-a", "home")).sections.map((s) => s.sectionKey)).toEqual(["hero", "quick-links"]);

    const settings = await updatePage(admin.ctx, w.tenantA.id, "home", { isEnabled: false, seoTitleEn: "Home" }, client);
    expect(settings).toMatchObject({ isEnabled: false, seoTitleEn: "Home" });
    await expectCode(getPublicPage("gp-a", "home"), "NOT_FOUND");
    await updatePage(admin.ctx, w.tenantA.id, "home", { isEnabled: true }, client);
    expect((await getPublicPage("gp-a", "home")).seo.titleEn).toBe("Home");

    expect((await getPublicPage("gp-b", "home")).sections).toEqual([]);
    await expectCode(getPublicPage("gp-a", "nope"), "NOT_FOUND");
    await db.tenant.update({ where: { id: w.tenantA.id }, data: { status: "DRAFT" } });
    await expectCode(getPublicPage("gp-a", "home"), "NOT_FOUND");
  });
});
