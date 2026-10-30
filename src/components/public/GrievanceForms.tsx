"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
import { getGrievanceFormSettings, submitGrievance, trackGrievance, uploadGrievanceAttachment } from "@/lib/api/public";
import { pickText } from "@/i18n/text";
import { Turnstile, TURNSTILE_SITE_KEY } from "./Turnstile";
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

/** Holds the newest single-use CAPTCHA token; `take()` waits for one when none is ready. */
class TokenBox {
  private token: string | null = null;
  private waiters: ((tok: string) => void)[] = [];
  set(tok: string | null) {
    this.token = tok;
    if (tok) this.waiters.splice(0).forEach((w) => w(tok));
  }
  has() {
    return this.token !== null;
  }
  async take(): Promise<string> {
    const tok = this.token ?? (await new Promise<string>((resolve) => this.waiters.push(resolve)));
    this.token = null;
    return tok;
  }
}

/** Figma "Register Your Complaint" → POST /public/:slug/grievances; shows the tracking code once. */
export function GrievanceSubmitForm({ slug }: { slug: string }) {
  const t = useTranslations("public.grievanceForm");
  const tc = useTranslations("common");
  const locale = useLocale() as UiLocale;
  const [receipt, setReceipt] = useState<PublicGrievanceReceiptDto | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaOn, setCaptchaOn] = useState(false);
  const [uploads, setUploads] = useState<{ on: boolean; maxMb: number; types: string[] }>({ on: false, maxMb: 10, types: [] });
  const [files, setFiles] = useState<File[]>([]);
  // Turnstile tokens work once: keep the latest one in a ref and remount the widget after each use.
  const [tk] = useState(() => new TokenBox());
  const [resetKey, setResetKey] = useState(0);
  function onToken(tok: string | null) {
    tk.set(tok);
  }
  /** A fresh CAPTCHA token (waits for the widget when needed); null when CAPTCHA is off. */
  async function takeToken(): Promise<string | undefined> {
    if (!captchaOn) return undefined;
    const tok = await tk.take();
    setResetKey((k) => k + 1);
    return tok;
  }
  const [successText, setSuccessText] = useState("");
  const [submitText, setSubmitText] = useState("");
  // The office's settings for this form (CAPTCHA, texts). Defaults apply if they cannot be loaded.
  useEffect(() => {
    getGrievanceFormSettings(slug)
      .then((s) => {
        setCaptchaOn(s.captchaEnabled);
        setUploads({ on: s.allowFileUpload, maxMb: s.maxFileSizeMb, types: s.allowedFileTypes });
        setSuccessText(pickText(s.successMessage ?? undefined, locale));
        setSubmitText(pickText(s.submitButtonText ?? undefined, locale));
      })
      .catch(() => undefined);
  }, [slug, locale]);
  const captchaBlocked = captchaOn && !TURNSTILE_SITE_KEY;
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubmitValues>({ resolver: zodResolver(submitSchema), defaultValues: { category: "water", citizenName: "", citizenPhone: "", citizenEmail: "", description: "" } });

  const MAX_FILES = 5;
  /** Adds the chosen files after checking count, size and type; returns an error text or null. */
  function pickFiles(picked: File[]): string | null {
    const next = [...files];
    for (const f of picked) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!uploads.types.includes(ext)) return t("fileTypeNotAllowed", { name: f.name });
      if (f.size > uploads.maxMb * 1024 * 1024) return t("fileTooLarge", { name: f.name, size: uploads.maxMb });
      if (next.length >= MAX_FILES) return t("tooManyFiles", { max: MAX_FILES });
      next.push(f);
    }
    setFiles(next);
    return null;
  }

  async function onSubmit(values: SubmitValues) {
    setFormError(null);
    if (captchaOn && !tk.has() && files.length === 0) return setFormError(t("captchaRequired"));
    try {
      const attachmentIds: string[] = [];
      for (const f of files) attachmentIds.push((await uploadGrievanceAttachment(slug, f, await takeToken())).id);
      const r = await submitGrievance(slug, {
        attachmentIds: attachmentIds.length ? attachmentIds : undefined,
        turnstileToken: await takeToken(),
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
        {successText && <p className="mt-2 text-sm text-ink">{successText}</p>}
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
      {uploads.on && (
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="grievance-files">
            {t("attachments")} ({tc("optional")})
          </label>
          <input
            id="grievance-files"
            type="file"
            multiple
            accept={uploads.types.map((x) => "." + x).join(",")}
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              e.target.value = "";
              const err = pickFiles(picked);
              setFormError(err);
            }}
            className="block w-full text-sm text-muted file:mr-3 file:rounded-button file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <p className="mt-1 text-xs text-muted">{t("attachHint", { max: MAX_FILES, size: uploads.maxMb, types: uploads.types.join(", ").toUpperCase() })}</p>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between rounded-input bg-surface-select px-3 py-1.5 text-sm text-ink">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="ml-3 text-xs font-semibold text-danger">
                    {t("removeFile")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {captchaOn && <Turnstile onToken={onToken} resetKey={resetKey} />}
      {captchaBlocked && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger sm:col-span-2">
          {t("captchaUnavailable")}
        </p>
      )}
      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger sm:col-span-2">
          {formError}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" loading={isSubmitting} disabled={captchaBlocked}>
          {submitText || t("submit")}
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
