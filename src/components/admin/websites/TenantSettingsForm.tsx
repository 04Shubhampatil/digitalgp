"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { TenantDto } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { tenants } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

const schema = z.object({
  nameEn: z.string().trim().min(1).max(200),
  nameMr: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(2).max(63).regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
  customDomain: z.string().trim().max(253),
  defaultLocale: z.enum(["EN", "MR", "HI"]),
  contactAddress: z.string().trim().max(500),
  contactPhone: z.string().trim().max(30),
  contactEmail: z.string().trim().max(254),
  contactHours: z.string().trim().max(200),
  facebook: z.string().trim().max(500),
  instagram: z.string().trim().max(500),
  youtube: z.string().trim().max(500),
  taglineEn: z.string().trim().max(300),
  taglineMr: z.string().trim().max(300),
  seoTitleEn: z.string().trim().max(300),
  seoTitleMr: z.string().trim().max(300),
  seoDescEn: z.string().trim().max(300),
  seoDescMr: z.string().trim().max(300),
});
type Values = z.infer<typeof schema>;

const opt = (s: string) => (s ? s : undefined);

/** Flat form values → the nested Tenant settings shape (src/features/tenants/validators.ts). */
function toPayload(v: Values) {
  return {
    nameEn: v.nameEn,
    nameMr: v.nameMr,
    slug: v.slug,
    customDomain: opt(v.customDomain) ?? null,
    defaultLocale: v.defaultLocale,
    settings: {
      contact: { address: opt(v.contactAddress), phone: opt(v.contactPhone), email: opt(v.contactEmail), hours: opt(v.contactHours) },
      social: { facebook: opt(v.facebook), instagram: opt(v.instagram), youtube: opt(v.youtube) },
      branding: { tagline: { en: opt(v.taglineEn), mr: opt(v.taglineMr) } },
      seo: { title: { en: opt(v.seoTitleEn), mr: opt(v.seoTitleMr) }, description: { en: opt(v.seoDescEn), mr: opt(v.seoDescMr) } },
    },
  };
}

function defaults(tn: TenantDto): Values {
  const c = tn.settings.contact ?? {};
  const s = tn.settings.social ?? {};
  const b = tn.settings.branding?.tagline ?? {};
  const seo = tn.settings.seo ?? {};
  return {
    nameEn: tn.nameEn,
    nameMr: tn.nameMr,
    slug: tn.slug,
    customDomain: tn.customDomain ?? "",
    defaultLocale: tn.defaultLocale,
    contactAddress: c.address ?? "",
    contactPhone: c.phone ?? "",
    contactEmail: c.email ?? "",
    contactHours: c.hours ?? "",
    facebook: s.facebook ?? "",
    instagram: s.instagram ?? "",
    youtube: s.youtube ?? "",
    taglineEn: b.en ?? "",
    taglineMr: b.mr ?? "",
    seoTitleEn: seo.title?.en ?? "",
    seoTitleMr: seo.title?.mr ?? "",
    seoDescEn: seo.description?.en ?? "",
    seoDescMr: seo.description?.mr ?? "",
  };
}

/** Website identity, contact, social, branding and SEO → PATCH /tenants/:id (`tenant:update`). */
export function TenantSettingsForm({ tenant, canUpdate }: { tenant: TenantDto; canUpdate: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults(tenant) });

  const onSubmit = (v: Values) =>
    start(async () => {
      setMessage(null);
      try {
        await tenants.update(tenant.id, toPayload(v));
        setMessage({ kind: "ok", text: tc("saved") });
        router.refresh();
      } catch (err) {
        const text = isApiError(err, "VALIDATION_ERROR")
          ? err.issues.map((i) => `${i.path}: ${i.message}`).join(" · ")
          : err instanceof Error
            ? err.message
            : tc("errorGeneric");
        setMessage({ kind: "error", text });
      }
    });

  return (
    <Card>
      <CardHeader title={t("settingsUi.title")} description={t("settingsUi.hint")} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="px-5 pb-5">
        <fieldset disabled={!canUpdate || pending} className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label={t("hierarchy.nameEn")} error={errors.nameEn?.message} {...register("nameEn")} />
            <Input label={t("hierarchy.nameMr")} lang="mr" error={errors.nameMr?.message} {...register("nameMr")} />
            <Input label={t("hierarchy.slug")} hint={t("websites.slugHint")} error={errors.slug?.message} {...register("slug")} />
            <Input label={t("settingsUi.customDomain")} placeholder="gpexample.in" error={errors.customDomain?.message} {...register("customDomain")} />
            <Select
              label={t("websites.defaultLocale")}
              options={[
                { value: "MR", label: tc("marathi") },
                { value: "EN", label: tc("english") },
                { value: "HI", label: "हिंदी" },
              ]}
              {...register("defaultLocale")}
            />
          </div>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t("settingsUi.contact")}</legend>
            <div className="sm:col-span-2">
              <Textarea label={t("settingsUi.address")} rows={3} error={errors.contactAddress?.message} {...register("contactAddress")} />
            </div>
            <Input label={t("settingsUi.phone")} type="tel" error={errors.contactPhone?.message} {...register("contactPhone")} />
            <Input label={t("settingsUi.email")} type="email" error={errors.contactEmail?.message} {...register("contactEmail")} />
            <Input label={t("settingsUi.hours")} placeholder="Mon–Fri 9:45–18:15" error={errors.contactHours?.message} {...register("contactHours")} />
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t("settingsUi.social")}</legend>
            <Input label="Facebook" type="url" placeholder="https://" error={errors.facebook?.message} {...register("facebook")} />
            <Input label="Instagram" type="url" placeholder="https://" error={errors.instagram?.message} {...register("instagram")} />
            <Input label="YouTube" type="url" placeholder="https://" error={errors.youtube?.message} {...register("youtube")} />
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t("settingsUi.branding")}</legend>
            <Input label={`${t("settingsUi.tagline")} · English`} error={errors.taglineEn?.message} {...register("taglineEn")} />
            <Input label={`${t("settingsUi.tagline")} · मराठी`} lang="mr" error={errors.taglineMr?.message} {...register("taglineMr")} />
            <Input label={`${t("settingsUi.seoTitle")} · English`} error={errors.seoTitleEn?.message} {...register("seoTitleEn")} />
            <Input label={`${t("settingsUi.seoTitle")} · मराठी`} lang="mr" error={errors.seoTitleMr?.message} {...register("seoTitleMr")} />
            <Textarea label={`${t("settingsUi.seoDescription")} · English`} rows={2} error={errors.seoDescEn?.message} {...register("seoDescEn")} />
            <Textarea label={`${t("settingsUi.seoDescription")} · मराठी`} lang="mr" rows={2} error={errors.seoDescMr?.message} {...register("seoDescMr")} />
          </fieldset>
        </fieldset>

        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={cn("mt-4 rounded-input px-4 py-3 text-sm", message.kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
            {message.text}
          </p>
        )}
        {canUpdate && (
          <div className="mt-5 flex justify-end">
            <Button type="submit" loading={pending}>
              {tc("save")}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}
