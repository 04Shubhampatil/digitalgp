import { actorFromContext, writeAudit } from "@/lib/audit";
import type { AuthContext } from "@/lib/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { Errors } from "@/lib/errors";
import type { ClientInfo } from "@/lib/http";
import { sendMail } from "@/lib/mailer";
import { assertCan } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getPublicTenantBySlug, getTenantForActor } from "@/lib/tenant";
import { paginate } from "@/lib/validation";
import type { FormSubmissionDto, FormSubmissionSummaryDto } from "@/types/api";
import type { FeedbackInput, ListFormSubmissionsQuery, VolunteerInput } from "@/features/forms/validators";

/**
 * Public contact-page forms (feedback and volunteer applications).
 *
 * Public side: a form works only while its Contact page section is published with `enabled` and
 * `showOnWebsite`. Submissions are rate limited per IP, checked by a honeypot field and, when
 * TURNSTILE_SECRET_KEY is set, Cloudflare Turnstile. Nothing from storage is returned publicly.
 *
 * Admin side: only users with `content:review` on the tenant's scope can list or read submissions.
 *
 * Retention: submissions older than FORM_SUBMISSION_RETENTION_MONTHS are deleted by
 * `purgeExpiredSubmissions` (run with `npm run forms:purge`). No IP address is stored.
 */

const SUBMIT_LIMIT_PER_IP = 5;
const SUBMIT_WINDOW_MS = 60 * 60 * 1000;

type Bilingual = { en?: string; mr?: string };
type FeedbackSettings = {
  enabled?: boolean;
  showOnWebsite?: boolean;
  recipientEmail?: string;
  notificationEmail?: string;
  successMessage?: Bilingual;
  autoReply?: Bilingual;
};
type VolunteerSettings = {
  enabled?: boolean;
  showOnWebsite?: boolean;
  deadline?: string;
  recipientEmail?: string;
  successMessage?: Bilingual;
};

/** Published data of one section, or null when the section is missing or hidden. */
async function publishedSection(tenantId: string, pageKey: string, sectionKey: string): Promise<Record<string, unknown> | null> {
  const section = await db.section.findFirst({
    where: { tenantId, sectionKey, page: { pageKey } },
    include: { published: true },
  });
  if (!section || !section.isVisible || !section.published) return null;
  return section.published.data as Record<string, unknown>;
}

function localized(value: Bilingual | undefined): string {
  return value?.en ?? value?.mr ?? "Thank you. Your message has been received.";
}

type SubmissionRow = {
  id: string;
  kind: "FEEDBACK" | "VOLUNTEER";
  name: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  message: string | null;
  createdAt: Date;
};

function toDto(row: SubmissionRow): FormSubmissionDto {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    email: row.email,
    phone: row.phone,
    category: row.category,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

/** A form that is switched off on the website behaves as if it does not exist. */
function assertOpen(settings: { enabled?: boolean; showOnWebsite?: boolean } | null): void {
  if (!settings || settings.enabled !== true || settings.showOnWebsite !== true) throw Errors.notFound("Form");
}

// ---------------------------------------------------------------------------
// Public submissions
// ---------------------------------------------------------------------------

export async function submitFeedback(tenantSlug: string, input: FeedbackInput, client: ClientInfo): Promise<{ message: string }> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const settings = (await publishedSection(tenant.id, "contact", "feedback-form")) as FeedbackSettings | null;
  assertOpen(settings);
  await consumeRateLimit(`feedback:ip:${client.ipAddress ?? "unknown"}`, SUBMIT_LIMIT_PER_IP, SUBMIT_WINDOW_MS);

  // Bots fill the hidden field: report success without storing or notifying anyone.
  if (input.website) return { message: localized(settings?.successMessage) };
  await verifyCaptcha(input.turnstileToken, client.ipAddress);

  const row = await db.formSubmission.create({
    data: {
      tenantId: tenant.id,
      kind: "FEEDBACK",
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      message: input.message,
    },
  });
  await writeAudit(actorFromContext(null, client), {
    action: "form.feedback_submit",
    entityType: "FormSubmission",
    entityId: row.id,
    tenantId: tenant.id,
    after: { kind: "FEEDBACK" },
  });

  const recipients = [settings?.recipientEmail, settings?.notificationEmail].filter((v): v is string => !!v);
  for (const to of new Set(recipients)) {
    await sendMail({
      to,
      subject: `${tenant.slug}: new feedback`,
      text: `Name: ${input.name}\nEmail: ${input.email ?? "-"}\nPhone: ${input.phone ?? "-"}\n\n${input.message}`,
    });
  }
  if (input.email && settings?.autoReply) {
    await sendMail({ to: input.email, subject: "Thank you for your feedback", text: localized(settings.autoReply) });
  }
  return { message: localized(settings?.successMessage) };
}

export async function submitVolunteer(tenantSlug: string, input: VolunteerInput, client: ClientInfo): Promise<{ message: string }> {
  const tenant = await getPublicTenantBySlug(tenantSlug);
  const settings = (await publishedSection(tenant.id, "contact", "volunteer-registration")) as VolunteerSettings | null;
  assertOpen(settings);
  if (settings?.deadline && new Date().toISOString().slice(0, 10) > settings.deadline) {
    throw Errors.badRequest("Volunteer registration is closed");
  }

  const categories = (await publishedSection(tenant.id, "contact", "volunteer-categories")) as { items?: { title?: Bilingual }[] } | null;
  const allowed = (categories?.items ?? []).flatMap((i) => [i.title?.en, i.title?.mr]).filter((v): v is string => !!v);
  if (!allowed.some((c) => c.toLowerCase() === input.category.toLowerCase())) {
    throw Errors.validation([{ path: "category", message: "Choose one of the listed volunteer categories" }]);
  }

  await consumeRateLimit(`volunteer:ip:${client.ipAddress ?? "unknown"}`, SUBMIT_LIMIT_PER_IP, SUBMIT_WINDOW_MS);
  if (input.website) return { message: localized(settings?.successMessage) };
  await verifyCaptcha(input.turnstileToken, client.ipAddress);

  const row = await db.formSubmission.create({
    data: {
      tenantId: tenant.id,
      kind: "VOLUNTEER",
      name: input.name,
      email: input.email,
      phone: input.phone,
      category: input.category,
      message: input.message ?? null,
    },
  });
  await writeAudit(actorFromContext(null, client), {
    action: "form.volunteer_submit",
    entityType: "FormSubmission",
    entityId: row.id,
    tenantId: tenant.id,
    after: { kind: "VOLUNTEER" },
  });

  if (settings?.recipientEmail) {
    await sendMail({
      to: settings.recipientEmail,
      subject: `${tenant.slug}: new volunteer application`,
      text: `Name: ${input.name}\nEmail: ${input.email}\nPhone: ${input.phone}\nCategory: ${input.category}\n\n${input.message ?? ""}`,
    });
  }
  return { message: localized(settings?.successMessage) };
}

// ---------------------------------------------------------------------------
// Admin: list, read, summary
// ---------------------------------------------------------------------------

export async function listFormSubmissions(ctx: AuthContext, query: ListFormSubmissionsQuery) {
  const tenant = await getTenantForActor(ctx, query.tenantId);
  assertCan(ctx, "content:review", { unitPath: tenant.unitPath });
  const rows = await db.formSubmission.findMany({
    where: { tenantId: tenant.id, kind: query.kind },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = paginate(rows, query.limit);
  return { ...page, items: page.items.map(toDto) };
}

export async function getFormSubmission(ctx: AuthContext, id: string): Promise<FormSubmissionDto> {
  const row = await db.formSubmission.findUnique({ where: { id } });
  if (!row) throw Errors.notFound("Submission");
  const tenant = await getTenantForActor(ctx, row.tenantId);
  assertCan(ctx, "content:review", { unitPath: tenant.unitPath });
  return toDto(row);
}

export async function formSubmissionSummary(ctx: AuthContext, tenantId: string): Promise<FormSubmissionSummaryDto> {
  const tenant = await getTenantForActor(ctx, tenantId);
  assertCan(ctx, "content:review", { unitPath: tenant.unitPath });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const count = (kind: "FEEDBACK" | "VOLUNTEER", from?: Date) =>
    db.formSubmission.count({ where: { tenantId: tenant.id, kind, ...(from ? { createdAt: { gte: from } } : {}) } });
  const [feedbackTotal, feedbackLast30Days, volunteerTotal, volunteerLast30Days] = await Promise.all([
    count("FEEDBACK"),
    count("FEEDBACK", since),
    count("VOLUNTEER"),
    count("VOLUNTEER", since),
  ]);
  return {
    feedback: { total: feedbackTotal, last30Days: feedbackLast30Days },
    volunteer: { total: volunteerTotal, last30Days: volunteerLast30Days },
  };
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

/** Delete submissions older than the retention window. Returns the number deleted. */
export async function purgeExpiredSubmissions(now: Date = new Date()): Promise<number> {
  const months = getEnv().FORM_SUBMISSION_RETENTION_MONTHS;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const result = await db.formSubmission.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
