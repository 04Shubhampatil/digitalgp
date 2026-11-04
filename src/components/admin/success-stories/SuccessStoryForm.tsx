"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { SuccessStoryDto } from "@/types/api";
import { MediaField } from "@/components/admin/editor/MediaField";
import { TenantSelect } from "@/components/admin/TenantSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { projects, schemes, STORY_PAGE_KEYS, successStories } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

const schema = z
  .object({
    tenantId: z.string().min(1, "Required"),
    pageKey: z.enum(STORY_PAGE_KEYS),
    titleEn: z.string().trim().max(200),
    titleMr: z.string().trim().max(200),
    summaryEn: z.string().trim().max(500),
    summaryMr: z.string().trim().max(500),
    bodyEn: z.string().trim().max(20_000),
    bodyMr: z.string().trim().max(20_000),
    quoteEn: z.string().trim().max(500),
    quoteMr: z.string().trim().max(500),
    personName: z.string().trim().max(120),
    personRoleEn: z.string().trim().max(160),
    personRoleMr: z.string().trim().max(160),
    location: z.string().trim().max(160),
    photoId: z.string(),
    projectId: z.string(),
    schemeId: z.string(),
    consentConfirmed: z.boolean(),
    sortOrder: z.string().trim().regex(/^\d{0,5}$/, "Whole number"),
  })
  .refine((v) => !!(v.titleEn || v.titleMr), { message: "A title in English or Marathi is required", path: ["titleEn"] });
type FormValues = z.infer<typeof schema>;
const nz = (s: string) => (s ? s : null);
type Option = { value: string; label: string };

/** Success story create/edit → POST/PATCH /success-stories (one website; `pages` module for operators). */
export function SuccessStoryForm({ existing, defaultTenantId }: { existing?: SuccessStoryDto; defaultTenantId?: string }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [schemeOptions, setSchemeOptions] = useState<Option[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenantId: existing?.tenantId ?? defaultTenantId ?? "",
      pageKey: (existing?.pageKey as FormValues["pageKey"] | undefined) ?? "home",
      titleEn: existing?.titleEn ?? "",
      titleMr: existing?.titleMr ?? "",
      summaryEn: existing?.summaryEn ?? "",
      summaryMr: existing?.summaryMr ?? "",
      bodyEn: existing?.bodyEn ?? "",
      bodyMr: existing?.bodyMr ?? "",
      quoteEn: existing?.quoteEn ?? "",
      quoteMr: existing?.quoteMr ?? "",
      personName: existing?.personName ?? "",
      personRoleEn: existing?.personRoleEn ?? "",
      personRoleMr: existing?.personRoleMr ?? "",
      location: existing?.location ?? "",
      photoId: existing?.photoId ?? "",
      projectId: existing?.projectId ?? "",
      schemeId: existing?.schemeId ?? "",
      consentConfirmed: existing?.consentConfirmed ?? false,
      sortOrder: existing ? String(existing.sortOrder) : "0",
    },
  });
  const { register, handleSubmit, control, setError, formState } = form;
  const tenantId = useWatch({ control, name: "tenantId" });
  const personName = useWatch({ control, name: "personName" });
  const photoId = useWatch({ control, name: "photoId" });
  const consent = useWatch({ control, name: "consentConfirmed" });
  const needsConsent = !!(personName.trim() || photoId);

  // Projects and schemes of the chosen website, for the optional link.
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const label = (en: string | null, mr: string | null) => en || mr || "—";
    Promise.all([projects.list({ tenantId, limit: 100 }).catch(() => null), schemes.list({ tenantId, limit: 100 }).catch(() => null)]).then(([p, s]) => {
      if (cancelled) return;
      setProjectOptions((p?.data ?? []).map((x) => ({ value: x.id, label: label(x.nameEn, x.nameMr) })));
      setSchemeOptions((s?.data ?? []).map((x) => ({ value: x.id, label: label(x.nameEn, x.nameMr) })));
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function onSubmit(v: FormValues) {
    setFormError(null);
    const body = {
      pageKey: v.pageKey,
      titleEn: nz(v.titleEn),
      titleMr: nz(v.titleMr),
      summaryEn: nz(v.summaryEn),
      summaryMr: nz(v.summaryMr),
      bodyEn: nz(v.bodyEn),
      bodyMr: nz(v.bodyMr),
      quoteEn: nz(v.quoteEn),
      quoteMr: nz(v.quoteMr),
      personName: nz(v.personName),
      personRoleEn: nz(v.personRoleEn),
      personRoleMr: nz(v.personRoleMr),
      location: nz(v.location),
      photoId: nz(v.photoId),
      projectId: nz(v.projectId),
      schemeId: nz(v.schemeId),
      consentConfirmed: v.consentConfirmed,
      sortOrder: v.sortOrder ? Number(v.sortOrder) : 0,
    };
    try {
      const saved = existing ? await successStories.update(existing.id, body) : await successStories.create({ ...body, tenantId: v.tenantId });
      router.push(`/admin/success-stories/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError((i.path in v ? i.path : "titleEn") as keyof FormValues, { message: i.message });
        return;
      }
      setFormError(isApiError(err) ? err.message : tc("errorGeneric"));
    }
  }

  const sectionCls = "rounded-card border border-line bg-surface p-5";
  const headingCls = "mb-4 text-[17px] font-bold text-ink";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <section className={sectionCls}>
        <h2 className={headingCls}>{t("storiesUi.placement")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {!existing && (
            <Controller control={control} name="tenantId" render={({ field }) => <TenantSelect label={t("announcements.tenant")} value={field.value} onChange={(id) => field.onChange(id)} error={formState.errors.tenantId?.message} />} />
          )}
          <Select label={t("storiesUi.page")} hint={t("storiesUi.pageHint")} options={STORY_PAGE_KEYS.map((k) => ({ value: k, label: t(`pageNames.${k}`) }))} {...register("pageKey")} />
          {/* Controlled so the saved link shows once the options have loaded. */}
          <Controller
            control={control}
            name="projectId"
            render={({ field }) => <Select label={`${t("storiesUi.project")} (${tc("optional")})`} placeholder={tc("none")} disabled={!tenantId} options={projectOptions} value={field.value} onChange={(e) => field.onChange(e.target.value)} error={formState.errors.projectId?.message} />}
          />
          <Controller
            control={control}
            name="schemeId"
            render={({ field }) => <Select label={`${t("storiesUi.scheme")} (${tc("optional")})`} placeholder={tc("none")} disabled={!tenantId} options={schemeOptions} value={field.value} onChange={(e) => field.onChange(e.target.value)} error={formState.errors.schemeId?.message} />}
          />
          <Input label={t("storiesUi.sortOrder")} inputMode="numeric" hint={t("storiesUi.sortOrderHint")} error={formState.errors.sortOrder?.message} {...register("sortOrder")} />
        </div>
      </section>

      <section className={sectionCls}>
        <h2 className={headingCls}>{t("storiesUi.story")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={`${t("storiesUi.title")} (${tc("english")})`} error={formState.errors.titleEn?.message} {...register("titleEn")} />
          <Input label={`${t("storiesUi.title")} (${tc("marathi")})`} lang="mr" error={formState.errors.titleMr?.message} {...register("titleMr")} />
          <Textarea label={`${t("storiesUi.summary")} (${tc("english")})`} rows={3} hint={t("storiesUi.summaryHint")} error={formState.errors.summaryEn?.message} {...register("summaryEn")} />
          <Textarea label={`${t("storiesUi.summary")} (${tc("marathi")})`} lang="mr" rows={3} error={formState.errors.summaryMr?.message} {...register("summaryMr")} />
          <Textarea label={`${t("storiesUi.body")} (${tc("english")})`} rows={8} error={formState.errors.bodyEn?.message} {...register("bodyEn")} />
          <Textarea label={`${t("storiesUi.body")} (${tc("marathi")})`} lang="mr" rows={8} error={formState.errors.bodyMr?.message} {...register("bodyMr")} />
          <Textarea label={`${t("storiesUi.quote")} (${tc("english")}, ${tc("optional")})`} rows={2} error={formState.errors.quoteEn?.message} {...register("quoteEn")} />
          <Textarea label={`${t("storiesUi.quote")} (${tc("marathi")}, ${tc("optional")})`} lang="mr" rows={2} error={formState.errors.quoteMr?.message} {...register("quoteMr")} />
        </div>
      </section>

      <section className={sectionCls}>
        <h2 className={headingCls}>{t("storiesUi.person")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={`${t("storiesUi.personName")} (${tc("optional")})`} error={formState.errors.personName?.message} {...register("personName")} />
          <Input label={`${t("storiesUi.location")} (${tc("optional")})`} placeholder={t("storiesUi.locationPlaceholder")} error={formState.errors.location?.message} {...register("location")} />
          <Input label={`${t("storiesUi.personRole")} (${tc("english")}, ${tc("optional")})`} placeholder={t("storiesUi.personRolePlaceholder")} error={formState.errors.personRoleEn?.message} {...register("personRoleEn")} />
          <Input label={`${t("storiesUi.personRole")} (${tc("marathi")}, ${tc("optional")})`} lang="mr" error={formState.errors.personRoleMr?.message} {...register("personRoleMr")} />
          <div className="sm:col-span-2">
            {tenantId ? (
              <Controller control={control} name="photoId" render={({ field }) => <MediaField label={`${t("storiesUi.photo")} (${tc("optional")})`} value={field.value} onChange={field.onChange} tenantId={tenantId} error={formState.errors.photoId?.message} />} />
            ) : (
              <p className="text-xs text-muted">{t("storiesUi.pickWebsiteFirst")}</p>
            )}
          </div>
          <div className={`rounded-card border p-4 sm:col-span-2 ${needsConsent && !consent ? "border-warning bg-warning-soft" : "border-line bg-surface-soft"}`}>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" {...register("consentConfirmed")} />
              <span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="size-4 text-primary" aria-hidden /> {t("storiesUi.consent")}
                </span>
                <span className="mt-1 block text-xs text-muted">{t("storiesUi.consentHint")}</span>
              </span>
            </label>
            {needsConsent && !consent && (
              <p role="status" className="mt-2 text-xs font-semibold text-warning">
                {t("storiesUi.consentNeeded")}
              </p>
            )}
          </div>
        </div>
      </section>

      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        <Link href={existing ? `/admin/success-stories/${existing.id}` : "/admin/success-stories"} className="text-sm font-semibold text-muted hover:text-ink">
          {tc("cancel")}
        </Link>
        <Button type="submit" loading={formState.isSubmitting}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
