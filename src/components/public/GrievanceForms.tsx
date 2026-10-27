"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { PublicGrievanceReceiptDto, PublicGrievanceStatusDto } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusPill } from "@/components/ui/StatusPill";
import { Textarea } from "@/components/ui/Textarea";
import type { UiLocale } from "@/i18n/config";
import { isApiError } from "@/lib/api/client";
import { submitGrievance, trackGrievance } from "@/lib/api/public";
import { formatDateTime } from "@/lib/format";

const CATEGORIES = ["water", "roads", "sanitation", "electricity", "health", "education", "certificates", "tax", "other"] as const;

const submitSchema = z.object({
  category: z.enum(CATEGORIES),
  citizenName: z.string().trim().min(2).max(120),
  citizenPhone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number").or(z.literal("")),
  citizenEmail: z.string().trim().pipe(z.email()).or(z.literal("")),
  description: z.string().trim().min(10).max(5000),
});
type SubmitValues = z.infer<typeof submitSchema>;

/** Figma "Register Your Complaint" → POST /public/:slug/grievances; shows the tracking code once. */
export function GrievanceSubmitForm({ slug }: { slug: string }) {
  const t = useTranslations("public.grievanceForm");
  const tc = useTranslations("common");
  const locale = useLocale() as UiLocale;
  const [receipt, setReceipt] = useState<PublicGrievanceReceiptDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubmitValues>({ resolver: zodResolver(submitSchema), defaultValues: { category: "water", citizenName: "", citizenPhone: "", citizenEmail: "", description: "" } });

  async function onSubmit(values: SubmitValues) {
    setFormError(null);
    try {
      const r = await submitGrievance(slug, {
        category: values.category,
        citizenName: values.citizenName,
        citizenPhone: values.citizenPhone || null,
        citizenEmail: values.citizenEmail || null,
        description: values.description,
      });
      setReceipt(r);
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError(i.path as keyof SubmitValues, { message: i.message });
        return;
      }
      if (isApiError(err, "RATE_LIMITED")) return setFormError(t("rateLimited"));
      setFormError(err instanceof Error ? err.message : tc("errorGeneric"));
    }
  }

  if (receipt) {
    return (
      <div className="rounded-card border border-line bg-success-soft p-6">
        <p className="text-sm font-semibold text-success">{t("submitted")}</p>
        <p className="mt-2 text-2xl font-bold tracking-wide text-ink">{receipt.trackingCode}</p>
        <p className="mt-2 text-sm text-muted">{t("keepCode")}</p>
        <p className="mt-1 text-xs text-muted">{formatDateTime(receipt.createdAt, locale)}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 rounded-card border border-line bg-surface p-6 sm:grid-cols-2">
      <Input label={t("name")} autoComplete="name" error={errors.citizenName?.message} {...register("citizenName")} />
      <Select label={t("category")} options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} error={errors.category?.message} {...register("category")} />
      <Input label={`${t("phone")} (${tc("optional")})`} type="tel" autoComplete="tel" error={errors.citizenPhone?.message} {...register("citizenPhone")} />
      <Input label={`${t("email")} (${tc("optional")})`} type="email" autoComplete="email" error={errors.citizenEmail?.message} {...register("citizenEmail")} />
      <div className="sm:col-span-2">
        <Textarea label={t("description")} rows={5} hint={t("descriptionHint")} error={errors.description?.message} {...register("description")} />
      </div>
      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger sm:col-span-2">
          {formError}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={isSubmitting}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}

/** Figma "Track Your Complaint" → GET /public/:slug/grievances/:trackingCode. */
export function GrievanceTrackForm({ slug }: { slug: string }) {
  const t = useTranslations("public.grievanceForm");
  const tc = useTranslations("common");
  const ta = useTranslations("admin");
  const locale = useLocale() as UiLocale;
  const [code, setCode] = useState("");
  const [result, setResult] = useState<PublicGrievanceStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!/^GRV-[A-Z0-9]{8}$/i.test(code.trim())) return setError(t("invalidCode"));
    setLoading(true);
    try {
      setResult(await trackGrievance(slug, code));
    } catch (err) {
      setError(isApiError(err, "NOT_FOUND") ? t("notFound") : err instanceof Error ? err.message : tc("errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-6">
      <form onSubmit={lookup} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input label={t("trackingCode")} placeholder="GRV-XXXXXXXX" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} error={error ?? undefined} />
        </div>
        <Button type="submit" size="lg" loading={loading}>
          {t("track")}
        </Button>
      </form>
      {result && (
        <div className="mt-5 border-t border-line pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-semibold text-ink">{result.trackingCode}</span>
            <StatusPill status={result.status} label={ta(`grievanceStatus.${result.status}`)} />
            <span className="text-xs text-muted">{(CATEGORIES as readonly string[]).includes(result.category) ? t(`categories.${result.category}`) : result.category}</span>
          </div>
          {result.resolutionNote && <p className="mt-3 rounded-input bg-success-soft px-4 py-3 text-sm text-ink">{result.resolutionNote}</p>}
          <ol className="mt-4 grid gap-2 text-sm">
            {result.timeline.map((e, i) => (
              <li key={i} className="flex items-center gap-3">
                <span aria-hidden className="size-2 rounded-full bg-primary" />
                <span className="font-semibold text-ink">{ta(`grievanceStatus.${e.status}`)}</span>
                <span className="text-xs text-muted">{formatDateTime(e.at, locale)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
