import { beforeEach, describe, expect, it } from "vitest";
import { getPublicComplaintForm, submitGrievance } from "@/features/grievances/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { setMailer, type MailMessage } from "@/lib/mailer";
import { buildWorld, client, createUser } from "../helpers/factories";

const sent: MailMessage[] = [];
beforeEach(() => {
  sent.length = 0;
  setMailer({ send: async (m) => void sent.push(m) });
});

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

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
  successMessage: { en: "Your complaint was registered" },
  submitButtonText: { en: "Submit" },
  recipientEmail: "grievance@gp-a.example",
  captchaEnabled: false,
  allowFileUpload: true,
  maxFileSizeMb: 2,
  allowedFileTypes: ["pdf", "png"],
};

const complaint = (attachmentIds?: string[]) => ({
  category: "Water supply",
  citizenName: "Asha Patil",
  citizenPhone: "+919876543210",
  description: "There has been no water in ward 2 for three days.",
  ...(attachmentIds ? { attachmentIds } : {}),
});

/** A stored media file of the given website (or another one). */
async function makeFile(tenantId: string, unitId: string, mimeType: string, sizeBytes: number) {
  const uploader = await createUser();
  return db.media.create({
    data: {
      tenantId,
      ownerUnitId: unitId,
      kind: "DOCUMENT",
      storageKey: `${tenantId}/${Math.random().toString(36).slice(2)}.bin`,
      originalName: "evidence",
      mimeType,
      sizeBytes,
      uploadedById: uploader.id,
    },
  });
}

describe("complaint form settings enforced on submit", () => {
  it("accepts an allowed file within the size limit, links it and notifies the recipient without citizen details", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const file = await makeFile(w.tenantA.id, w.gpA.id, "application/pdf", 1024 * 1024);

    const receipt = await submitGrievance("gp-a", complaint([file.id]), client);
    const row = await db.grievance.findUniqueOrThrow({ where: { trackingCode: receipt.trackingCode }, include: { attachments: true } });
    expect(row.attachments.map((a) => a.mediaId)).toEqual([file.id]);

    const note = sent.find((m) => m.to === "grievance@gp-a.example");
    expect(note?.text).toContain(receipt.trackingCode);
    expect(note?.text).not.toContain("Asha Patil");
    expect(note?.text).not.toContain("+919876543210");
  });

  it("refuses files when uploads are switched off", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, { ...form, allowFileUpload: false });
    const file = await makeFile(w.tenantA.id, w.gpA.id, "application/pdf", 1024);
    await expectCode(submitGrievance("gp-a", complaint([file.id]), client), "BAD_REQUEST");
  });

  it("refuses files over the size limit", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const big = await makeFile(w.tenantA.id, w.gpA.id, "application/pdf", 3 * 1024 * 1024);
    await expectCode(submitGrievance("gp-a", complaint([big.id]), client), "VALIDATION_ERROR");
  });

  it("refuses file types that are not allowed", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const jpg = await makeFile(w.tenantA.id, w.gpA.id, "image/jpeg", 1024);
    await expectCode(submitGrievance("gp-a", complaint([jpg.id]), client), "VALIDATION_ERROR");
  });

  it("refuses files that belong to another website", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const other = await makeFile(w.tenantB.id, w.gpB.id, "application/pdf", 1024);
    await expectCode(submitGrievance("gp-a", complaint([other.id]), client), "VALIDATION_ERROR");
  });

  it("refuses the same file twice", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const file = await makeFile(w.tenantA.id, w.gpA.id, "application/pdf", 1024);
    await expectCode(submitGrievance("gp-a", complaint([file.id, file.id]), client), "VALIDATION_ERROR");
  });

  it("requires CAPTCHA when the form enables it, and fails closed while no key is configured", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, { ...form, captchaEnabled: true, allowFileUpload: false });
    await expectCode(submitGrievance("gp-a", complaint(), client), "INTERNAL_ERROR");
    expect(await db.grievance.count({ where: { tenantId: w.tenantA.id } })).toBe(0);
  });

  it("without a published form, submissions keep working but cannot attach files", async () => {
    const w = await buildWorld();
    const file = await makeFile(w.tenantA.id, w.gpA.id, "application/pdf", 1024);
    await expectCode(submitGrievance("gp-a", complaint([file.id]), client), "BAD_REQUEST");
    const receipt = await submitGrievance("gp-a", complaint(), client);
    expect(receipt.trackingCode).toMatch(/^GRV-/);
    expect(sent).toHaveLength(0);
  });
});

describe("public complaint form settings", () => {
  it("returns what the form needs but never the recipient address", async () => {
    const w = await buildWorld();
    await publishComplaintForm(w.tenantA.id, form);
    const pub = await getPublicComplaintForm("gp-a");
    expect(pub).toMatchObject({ captchaEnabled: false, allowFileUpload: true, maxFileSizeMb: 2, allowedFileTypes: ["pdf", "png"], heading: { en: "Register a complaint" } });
    expect(JSON.stringify(pub)).not.toContain("grievance@gp-a.example");
  });

  it("falls back to safe defaults when the section is not published", async () => {
    await buildWorld();
    const pub = await getPublicComplaintForm("gp-a");
    expect(pub).toMatchObject({ captchaEnabled: false, allowFileUpload: false, maxFileSizeMb: 10, allowedFileTypes: [] });
  });
});
