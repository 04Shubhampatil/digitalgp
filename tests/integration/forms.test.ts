import { describe, expect, it, beforeEach } from "vitest";
import {
  formSubmissionSummary,
  getFormSubmission,
  listFormSubmissions,
  purgeExpiredSubmissions,
  submitFeedback,
  submitVolunteer,
} from "@/features/forms/service";
import { feedbackSchema, volunteerSchema } from "@/features/forms/validators";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { setMailer, type MailMessage } from "@/lib/mailer";
import { actor, buildWorld, client, createUser } from "../helpers/factories";

const sent: MailMessage[] = [];
beforeEach(() => {
  sent.length = 0;
  setMailer({ send: async (m) => void sent.push(m) });
});

const expectCode = async (p: Promise<unknown>, code: string) => {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
};

/** Publish one Contact-page section directly (the same rows the editor's Publish action writes). */
async function publish(tenantId: string, sectionKey: string, data: object) {
  const author = await createUser();
  const page = await db.page.findUniqueOrThrow({ where: { tenantId_pageKey: { tenantId, pageKey: "contact" } } });
  const section = await db.section.create({ data: { tenantId, pageId: page.id, sectionKey, sortOrder: 0 } });
  const rev = await db.sectionRevision.create({
    data: { tenantId, sectionId: section.id, version: 1, status: "PUBLISHED", data: data as never, createdById: author.id, publishedById: author.id, publishedAt: new Date() },
  });
  await db.section.update({ where: { id: section.id }, data: { publishedId: rev.id } });
}

const feedbackSettings = {
  enabled: true,
  showOnWebsite: true,
  heading: { en: "Share your feedback" },
  successMessage: { en: "Thank you for your feedback" },
  recipientEmail: "office@gp-a.example",
  notificationEmail: "secretary@gp-a.example",
  autoReply: { en: "We have received your message." },
  submitButtonText: { en: "Send" },
};

const volunteerSettings = {
  enabled: true,
  showOnWebsite: true,
  heading: { en: "Become a volunteer" },
  successMessage: { en: "Thanks for volunteering" },
  recipientEmail: "volunteers@gp-a.example",
  submitButtonText: { en: "Register" },
};

const feedbackInput = {
  name: "Asha Patil",
  email: "asha@example.com",
  phone: "+919876543210",
  message: "Please repair the road near ward 2.",
  website: "",
};

const volunteerInput = {
  name: "Ravi Jadhav",
  email: "ravi@example.com",
  phone: "+919812345678",
  category: "Youth training",
  message: "Available on weekends.",
  website: "",
};

describe("public feedback form", () => {
  it("is not found until the form is published and switched on", async () => {
    await buildWorld();
    await expectCode(submitFeedback("gp-a", feedbackInput, client), "NOT_FOUND");
    await publish((await db.tenant.findUniqueOrThrow({ where: { slug: "gp-a" } })).id, "feedback-form", { ...feedbackSettings, showOnWebsite: false });
    await expectCode(submitFeedback("gp-a", feedbackInput, client), "NOT_FOUND");
  });

  it("stores the submission for the tenant, notifies the recipients and returns only the success message", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "feedback-form", feedbackSettings);

    const res = await submitFeedback("gp-a", feedbackInput, client);
    expect(res).toEqual({ message: "Thank you for your feedback" });

    const rows = await db.formSubmission.findMany({ where: { tenantId: w.tenantA.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "FEEDBACK", name: "Asha Patil", email: "asha@example.com" });

    const to = sent.map((m) => m.to);
    expect(to).toEqual(expect.arrayContaining(["office@gp-a.example", "secretary@gp-a.example", "asha@example.com"]));
    expect(sent.find((m) => m.to === "asha@example.com")?.text).toBe("We have received your message.");
  });

  it("does not auto-reply when no email was given", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "feedback-form", feedbackSettings);
    await submitFeedback("gp-a", { ...feedbackInput, email: null }, client);
    expect(sent.map((m) => m.to)).not.toContain("asha@example.com");
  });

  it("pretends success for bots that fill the honeypot, without storing or notifying", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "feedback-form", feedbackSettings);
    const res = await submitFeedback("gp-a", { ...feedbackInput, website: "http://spam.example" }, client);
    expect(res.message).toBe("Thank you for your feedback");
    expect(await db.formSubmission.count({ where: { tenantId: w.tenantA.id } })).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("rate limits repeated submissions per IP", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "feedback-form", feedbackSettings);
    for (let i = 0; i < 5; i++) await submitFeedback("gp-a", feedbackInput, client);
    await expectCode(submitFeedback("gp-a", feedbackInput, client), "RATE_LIMITED");
  });

  it("validates every field on the server", () => {
    expect(feedbackSchema.safeParse({ ...feedbackInput, name: "A" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...feedbackInput, email: "not-an-email" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...feedbackInput, message: "short" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...feedbackInput, extra: 1 }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...feedbackInput, website: "filled" }).success).toBe(false);
  });
});

describe("public volunteer form", () => {
  it("requires the category to be one of the published volunteer categories", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "volunteer-registration", volunteerSettings);
    await publish(w.tenantA.id, "volunteer-categories", { items: [{ title: { en: "Youth training", mr: "युवा प्रशिक्षण" }, order: 1 }] });
    await expectCode(submitVolunteer("gp-a", { ...volunteerInput, category: "Gardening" }, client), "VALIDATION_ERROR");
    const res = await submitVolunteer("gp-a", volunteerInput, client);
    expect(res.message).toBe("Thanks for volunteering");
    expect(await db.formSubmission.count({ where: { tenantId: w.tenantA.id, kind: "VOLUNTEER" } })).toBe(1);
  });

  it("refuses applications after the registration deadline", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "volunteer-registration", { ...volunteerSettings, deadline: "2020-01-01" });
    await publish(w.tenantA.id, "volunteer-categories", { items: [{ title: { en: "Youth training" }, order: 1 }] });
    await expectCode(submitVolunteer("gp-a", volunteerInput, client), "BAD_REQUEST");
  });

  it("requires email and phone", () => {
    expect(volunteerSchema.safeParse({ ...volunteerInput, email: undefined }).success).toBe(false);
    expect(volunteerSchema.safeParse({ ...volunteerInput, phone: "12" }).success).toBe(false);
  });
});

describe("admin access to submissions", () => {
  it("a GP admin of the website can list, read and count its submissions", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "feedback-form", feedbackSettings);
    await submitFeedback("gp-a", feedbackInput, client);
    const admin = await actor("GP_ADMIN", w.gpA.id);

    const page = await listFormSubmissions(admin.ctx, { tenantId: w.tenantA.id, kind: "FEEDBACK", limit: 20 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).not.toHaveProperty("ipAddress");
    expect(await getFormSubmission(admin.ctx, page.items[0]!.id)).toMatchObject({ name: "Asha Patil" });
    expect(await formSubmissionSummary(admin.ctx, w.tenantA.id)).toEqual({
      feedback: { total: 1, last30Days: 1 },
      volunteer: { total: 0, last30Days: 0 },
    });
  });

  it("another website's admin cannot list or read these submissions", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "feedback-form", feedbackSettings);
    await submitFeedback("gp-a", feedbackInput, client);
    const row = await db.formSubmission.findFirstOrThrow({ where: { tenantId: w.tenantA.id } });
    const adminB = await actor("GP_ADMIN", w.gpB.id);

    await expectCode(listFormSubmissions(adminB.ctx, { tenantId: w.tenantA.id, kind: "FEEDBACK", limit: 20 }), "NOT_FOUND");
    await expectCode(getFormSubmission(adminB.ctx, row.id), "NOT_FOUND");
    await expectCode(formSubmissionSummary(adminB.ctx, w.tenantA.id), "NOT_FOUND");
  });

  it("operators without review rights are refused", async () => {
    const w = await buildWorld();
    const operator = await actor("DATA_ENTRY_OPERATOR", w.gpA.id, [{ moduleKey: "announcements" }]);
    await expectCode(listFormSubmissions(operator.ctx, { tenantId: w.tenantA.id, kind: "FEEDBACK", limit: 20 }), "FORBIDDEN");
  });
});

describe("retention", () => {
  it("deletes submissions older than the retention window and keeps recent ones", async () => {
    const w = await buildWorld();
    await publish(w.tenantA.id, "feedback-form", feedbackSettings);
    await submitFeedback("gp-a", feedbackInput, client);
    const old = await db.formSubmission.create({
      data: { tenantId: w.tenantA.id, kind: "FEEDBACK", name: "Old Visitor", message: "A very old message." },
    });
    const longAgo = new Date();
    longAgo.setMonth(longAgo.getMonth() - 13);
    await db.formSubmission.update({ where: { id: old.id }, data: { createdAt: longAgo } });

    const deleted = await purgeExpiredSubmissions();
    expect(deleted).toBe(1);
    expect(await db.formSubmission.findUnique({ where: { id: old.id } })).toBeNull();
    expect(await db.formSubmission.count({ where: { tenantId: w.tenantA.id } })).toBe(1);
  });
});
