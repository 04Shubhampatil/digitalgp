import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as uploadRoute } from "@/app/api/v1/public/[tenantSlug]/grievance-attachments/route";
import { purgeExpiredGrievanceUploads, uploadGrievanceAttachment } from "@/features/grievances/attachments";
import { getGrievance, submitGrievance } from "@/features/grievances/service";
import { getMediaFile, getPublicMediaFile, listMedia } from "@/features/media/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { setMailer } from "@/lib/mailer";
import { LocalDiskStorage, setStorage } from "@/lib/storage";
import { actor, buildWorld, client, createUser, params } from "../helpers/factories";

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1]);
const PDF = new TextEncoder().encode("%PDF-1.4\n%fake\n");
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const HTML = new TextEncoder().encode("<html><script>alert(1)</script></html>");

let dir: string;
let storage: LocalDiskStorage;
beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "dgp-grv-"));
  storage = new LocalDiskStorage(dir);
  setStorage(storage);
});
afterAll(async () => {
  setStorage(undefined);
  await rm(dir, { recursive: true, force: true });
});
beforeEach(() => setMailer({ send: async () => undefined }));

async function publishComplaintForm(tenantId: string, data: object) {
  const author = await createUser();
  const page = await db.page.findUniqueOrThrow({ where: { tenantId_pageKey: { tenantId, pageKey: "grievance" } } });
  const section = await db.section.create({ data: { tenantId, pageId: page.id, sectionKey: "complaint-form", sortOrder: 10 } });
  const rev = await db.sectionRevision.create({
    data: { tenantId, sectionId: section.id, version: 1, status: "PUBLISHED", data: data as never, createdById: author.id, publishedById: author.id, publishedAt: new Date() },
  });
  await db.section.update({ where: { id: section.id }, data: { publishedId: rev.id } });
}

const form = {
  heading: { en: "Register a complaint" },
  successMessage: { en: "Done" },
  submitButtonText: { en: "Submit" },
  recipientEmail: "grievance@gp-a.example",
  captchaEnabled: false,
  allowFileUpload: true,
  maxFileSizeMb: 1,
  allowedFileTypes: ["pdf", "png"],
};

const complaint = (attachmentIds: string[] = []) => ({
  category: "Water supply",
  citizenName: "Asha Patil",
  description: "There has been no water in ward 2 for three days.",
  attachmentIds,
});

const upload = (slug: string, bytes: Uint8Array, name = "evidence.bin", type: string | null = null, ip = "203.0.113.5") =>
  uploadGrievanceAttachment(slug, {}, { name, type, bytes }, { ipAddress: ip, userAgent: "vitest" });

describe("public complaint attachments", () => {
  it("stores an allowed file as a pending PUBLIC_GRIEVANCE media row and returns only the id", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const res = await upload("gp-a", PNG, "../photo.exe", "application/pdf");
    expect(Object.keys(res)).toEqual(["id"]);
    const row = await db.media.findUniqueOrThrow({ where: { id: res.id } });
    expect(row).toMatchObject({ tenantId: w.tenantA.id, source: "PUBLIC_GRIEVANCE", uploadedById: null, mimeType: "image/png", kind: "IMAGE", originalName: "photo.exe" });
    expect(row.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(row.storageKey).toBe(`${w.tenantA.id}/grievance/${res.id}.png`);
    expect(await storage.get(row.storageKey)).not.toBeNull();
    expect((await db.auditLog.findMany({ where: { entityId: res.id } })).map((a) => a.action)).toEqual(["grievance.attachment_upload"]);
  });

  it("is unavailable when uploads are off or the website is not published", async () => {
    const w = await buildWorld();
    await expectCode(upload("gp-a", PDF), "NOT_FOUND"); // no published form at all
    await publishComplaintForm(w.tenantB.id, { ...form, allowFileUpload: false });
    await expectCode(upload("gp-b", PDF), "NOT_FOUND");
    await publishComplaintForm(w.tenantC.id, form);
    await db.tenant.update({ where: { id: w.tenantC.id }, data: { status: "DRAFT" } });
    await expectCode(upload("gp-c", PDF), "NOT_FOUND");
  });

  it("checks the real content type and the form's size limit, never the declared type", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    await expectCode(upload("gp-a", HTML, "x.png", "image/png"), "BAD_REQUEST");
    await expectCode(upload("gp-a", JPG, "x.png", "image/png"), "BAD_REQUEST"); // jpg not in allowedFileTypes
    const big = new Uint8Array(1024 * 1024 + 1);
    big.set(PDF);
    await expectCode(upload("gp-a", big, "big.pdf"), "BAD_REQUEST");
    await expectCode(upload("gp-a", new Uint8Array(), "empty.pdf"), "BAD_REQUEST");
    expect(await db.media.count({ where: { tenantId: w.tenantA.id } })).toBe(0);
  });

  it("rate-limits per IP, honours the honeypot and fails closed when CAPTCHA is required without a key", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const fake = await uploadGrievanceAttachment("gp-a", { website: "http://spam" }, { name: "a.pdf", type: null, bytes: PDF }, client);
    expect(fake.id).toMatch(/^[a-f0-9]{24}$/);
    expect(await db.media.count()).toBe(0);
    await expectCode(submitGrievance("gp-a", complaint([fake.id]), client), "VALIDATION_ERROR");

    for (let i = 0; i < 10; i++) await upload("gp-a", PDF, "a.pdf", null, "198.51.100.7");
    await expectCode(upload("gp-a", PDF, "a.pdf", null, "198.51.100.7"), "RATE_LIMITED");

    await publishComplaintForm(w.tenantB.id, { ...form, captchaEnabled: true });
    await expectCode(upload("gp-b", PDF), "INTERNAL_ERROR");
  });

  it("attaches on submit, shows the file to staff only, and hides it from the library and the public media route", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const admin = await actor("GP_ADMIN", w.gpA.id);
    const adminB = await actor("GP_ADMIN", w.gpB.id);
    const { id } = await upload("gp-a", PDF, "bill.pdf");

    // A pending upload of website A cannot be attached to a complaint on website B.
    await publishComplaintForm(w.tenantB.id, form);
    await expectCode(submitGrievance("gp-b", complaint([id]), client), "VALIDATION_ERROR");

    const receipt = await submitGrievance("gp-a", complaint([id]), client);
    const grievanceId = (await db.grievance.findUniqueOrThrow({ where: { trackingCode: receipt.trackingCode } })).id;
    const detail = await getGrievance(admin.ctx, grievanceId);
    expect(detail.attachments).toEqual([{ id, originalName: "bill.pdf", sizeBytes: PDF.byteLength, mimeType: "application/pdf", kind: "DOCUMENT", uploadedAt: expect.any(String) }]);
    expect((await db.media.findUniqueOrThrow({ where: { id } })).expiresAt).toBeNull();

    // Staff in scope can fetch the bytes; another website's admin cannot; the public cannot.
    expect((await getMediaFile(admin.ctx, id)).mimeType).toBe("application/pdf");
    await expectCode(getMediaFile(adminB.ctx, id), "NOT_FOUND");
    await expectCode(getPublicMediaFile("gp-a", id), "NOT_FOUND");
    expect((await listMedia(admin.ctx, { limit: 10 })).items).toEqual([]);
  });

  it("purges unattached uploads after expiry and keeps attached ones", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const stale = await upload("gp-a", PDF);
    const fresh = await upload("gp-a", PDF);
    const attached = await upload("gp-a", PDF);
    await submitGrievance("gp-a", complaint([attached.id]), client);
    await db.media.update({ where: { id: stale.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const staleKey = (await db.media.findUniqueOrThrow({ where: { id: stale.id } })).storageKey;

    expect(await purgeExpiredGrievanceUploads()).toBe(1);
    expect(await db.media.findUnique({ where: { id: stale.id } })).toBeNull();
    expect(await storage.get(staleKey)).toBeNull();
    expect(await db.media.count({ where: { id: { in: [fresh.id, attached.id] } } })).toBe(2);
    // Far in the future everything unattached goes, attached files stay.
    expect(await purgeExpiredGrievanceUploads(new Date(Date.now() + 365 * 24 * 3600 * 1000))).toBe(1);
    expect(await db.media.count()).toBe(1);
  });

  it("upload route accepts multipart form data and validates it", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const fd = new FormData();
    fd.set("file", new File([PNG], "photo.png", { type: "image/png" }));
    fd.set("website", "");
    const res = await uploadRoute(new NextRequest("http://localhost:3000/api/v1/public/gp-a/grievance-attachments", { method: "POST", body: fd }), params({ tenantSlug: "gp-a" }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { data: { id: string } };
    expect(Object.keys(body.data)).toEqual(["id"]);

    const noFile = new FormData();
    const bad = await uploadRoute(new NextRequest("http://localhost:3000/api/v1/public/gp-a/grievance-attachments", { method: "POST", body: noFile }), params({ tenantSlug: "gp-a" }));
    expect(bad.status).toBe(400);
    const json = await uploadRoute(new NextRequest("http://localhost:3000/api/v1/public/gp-a/grievance-attachments", { method: "POST", body: "{}", headers: { "content-type": "application/json" } }), params({ tenantSlug: "gp-a" }));
    expect(json.status).toBe(400);
  });
});
