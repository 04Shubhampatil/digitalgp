"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Search, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { forwardRef, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { PublicGrievanceReceiptDto, PublicGrievanceStatusDto } from "@/types/api";
import { StatusPill } from "@/components/ui/StatusPill";
import type { UiLocale } from "@/i18n/config";
import { isApiError } from "@/lib/api/client";
import { getGrievanceFormSettings, submitGrievance, trackGrievance, uploadGrievanceAttachment } from "@/lib/api/public";
import { pickText } from "@/i18n/text";
import { cn } from "@/lib/cn";
import { Turnstile, TURNSTILE_SITE_KEY } from "./Turnstile";
import { formatDateTime } from "@/lib/format";

const CATEGORIES = ["water", "roads", "sanitation", "electricity", "health", "education", "certificates", "tax", "other"] as const;
/** "Complaint Type" choices of the Figma form. Not an API field: folded into the description (see composeDescription). */
const TYPES = ["complaint", "request", "suggestion"] as const;

const submitSchema = z.object({
  category: z.enum(CATEGORIES, { message: "Select a category" }),
  complaintType: z.enum(TYPES).or(z.literal("")),
  citizenName: z.string().trim().min(2).max(120),
  citizenPhone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number").or(z.literal("")),
  citizenEmail: z.string().trim().pipe(z.email()).or(z.literal("")),
  location: z.string().trim().max(150),
  subject: z.string().trim().max(150),
  // The API allows 5000 characters in total; the folded type / location / subject lines need some of them.
  description: z.string().trim().min(10).max(4500),
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

// Figma "Register Your Complaint" (375:11315): 18px semibold labels, 50px fields with a 17px radius.
const fieldCls = "w-full rounded-[17px] border-[1.5px] border-[#414141]/50 bg-white px-5 text-[15px] text-black placeholder:font-semibold placeholder:text-[#414141]/50 focus:border-[#135130] focus:outline-none";

function Field({ label, error, htmlFor, className, children }: { label: string; error?: string; htmlFor: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={htmlFor} className="text-[18px] leading-6 font-semibold text-black">
        {label}
      </label>
      {children}
      {error && <p className="text-[12px] text-red-700">{error}</p>}
    </div>
  );
}

type TextProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };
const TextField = forwardRef<HTMLInputElement, TextProps>(function TextField({ label, error, id, className, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} error={error} htmlFor={fid} className={className}>
      <input ref={ref} id={fid} aria-invalid={!!error} className={cn(fieldCls, "h-[50px]")} {...rest} />
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string; placeholder: string; options: { value: string; label: string }[] };
const SelectField = forwardRef<HTMLSelectElement, SelectProps>(function SelectField({ label, error, placeholder, options, id, className, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} error={error} htmlFor={fid} className={className}>
      <div className="relative">
        <select ref={ref} id={fid} aria-invalid={!!error} className={cn(fieldCls, "h-[50px] appearance-none pr-10 invalid:font-semibold invalid:text-[#414141]/50")} {...rest}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-black">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-[#414141]" />
      </div>
    </Field>
  );
});

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };
const AreaField = forwardRef<HTMLTextAreaElement, AreaProps>(function AreaField({ label, error, id, className, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Field label={label} error={error} htmlFor={fid} className={className}>
      <textarea ref={ref} id={fid} aria-invalid={!!error} className={cn(fieldCls, "h-[148px] resize-y py-3")} {...rest} />
    </Field>
  );
});

/**
 * The complaint API (POST /public/:slug/grievances) has no complaint type, location or subject field.
 * The design asks for them, so their values are folded into the description text the office receives
 * instead of being dropped (see docs/backend-needs-public-site.md).
 */
function composeDescription(v: SubmitValues, labels: { type: string; location: string; subject: string }, typeLabel: string): string {
  const head = [v.complaintType && `${labels.type}: ${typeLabel}`, v.location && `${labels.location}: ${v.location}`, v.subject && `${labels.subject}: ${v.subject}`].filter(Boolean);
  return head.length ? `${head.join("\n")}\n\n${v.description}` : v.description;
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
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
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
  // The office's settings for this form (CAPTCHA, uploads, texts). Defaults apply if they cannot be loaded.
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
  } = useForm<SubmitValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: { category: "" as SubmitValues["category"], complaintType: "", citizenName: "", citizenPhone: "", citizenEmail: "", location: "", subject: "", description: "" },
  });

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
        description: composeDescription(values, { type: t("type"), location: t("location"), subject: t("subject") }, values.complaintType ? t(`types.${values.complaintType}`) : ""),
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
      <div className="rounded-[11px] border border-[#414141]/50 bg-[#eef5ee] p-6">
        <p className="text-sm font-semibold text-[#135130]">{t("submitted")}</p>
        <p className="mt-2 text-2xl font-bold tracking-wide text-black">{receipt.trackingCode}</p>
        {successText && <p className="mt-2 text-sm text-black">{successText}</p>}
        <p className="mt-2 text-sm text-[#414141]">{t("keepCode")}</p>
        <p className="mt-1 text-xs text-[#414141]">{formatDateTime(receipt.createdAt, locale)}</p>
      </div>
    );
  }

  const typesText = uploads.types.map((x) => x.toUpperCase()).join(", ");
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-x-7 gap-y-4 rounded-[11px] border border-[#414141]/50 bg-white p-6 md:grid-cols-3">
      <TextField label={t("name")} placeholder={t("namePlaceholder")} autoComplete="name" error={errors.citizenName?.message} {...register("citizenName")} />
      <TextField label={t("phone")} placeholder={t("phonePlaceholder")} type="tel" autoComplete="tel" error={errors.citizenPhone?.message} {...register("citizenPhone")} />
      <TextField label={t("email")} placeholder={t("emailPlaceholder")} type="email" autoComplete="email" error={errors.citizenEmail?.message} {...register("citizenEmail")} />
      <SelectField label={t("category")} placeholder={t("categoryPlaceholder")} required options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} error={errors.category ? t("categoryRequired") : undefined} {...register("category")} />
      <SelectField label={t("type")} placeholder={t("typePlaceholder")} required options={TYPES.map((c) => ({ value: c, label: t(`types.${c}`) }))} error={errors.complaintType?.message} {...register("complaintType")} />
      <TextField label={t("location")} placeholder={t("locationPlaceholder")} error={errors.location?.message} {...register("location")} />
      <div className="flex flex-col gap-4">
        <TextField label={t("subject")} placeholder={t("subjectPlaceholder")} error={errors.subject?.message} {...register("subject")} />
        {uploads.on && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              setFormError(pickFiles(Array.from(e.dataTransfer.files)));
            }}
            className={cn("mt-2 rounded-[17px] border-[1.5px] border-[#414141]/50 px-5 py-4", dragging && "border-[#135130] bg-[#eef5ee]")}
          >
            <p className="text-[15px] font-semibold text-black">{t("uploadTitle")}</p>
            <div className="mt-3 flex items-start gap-3">
              <Upload aria-hidden className="mt-1 size-6 shrink-0 text-black" />
              <p className="text-[15px] leading-[22px] text-black">
                {t("dropHint")}{" "}
                <button type="button" onClick={() => fileInput.current?.click()} className="text-[#138808] hover:underline">
                  {t("browse")}
                </button>{" "}
                {t("dropTypes", { types: typesText, size: uploads.maxMb })}
              </p>
            </div>
            <input
              ref={fileInput}
              id="grievance-files"
              type="file"
              multiple
              accept={uploads.types.map((x) => "." + x).join(",")}
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = "";
                setFormError(pickFiles(picked));
              }}
              className="sr-only"
              aria-label={t("uploadTitle")}
            />
            {files.length > 0 && (
              <ul className="mt-3 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-[8px] bg-[#eef5ee] px-3 py-1.5 text-[13px] text-black">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="ml-3 text-xs font-semibold text-red-700">
                      {t("removeFile")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 md:col-span-2">
        <AreaField label={t("description")} placeholder={t("descriptionPlaceholder")} error={errors.description?.message} {...register("description")} />
        <div className="flex flex-wrap items-center justify-end gap-3">
          {captchaOn && <Turnstile onToken={onToken} resetKey={resetKey} />}
          <button
            type="submit"
            disabled={captchaBlocked || isSubmitting}
            className="inline-flex h-[34px] min-w-[172px] items-center justify-center rounded-full border border-[#135130] bg-[#135130] px-5 text-[12px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "…" : submitText || t("submit")}
          </button>
        </div>
      </div>
      {captchaBlocked && (
        <p role="alert" className="rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-3">
          {t("captchaUnavailable")}
        </p>
      )}
      {formError && (
        <p role="alert" className="rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-3">
          {formError}
        </p>
      )}
    </form>
  );
}

/**
 * Figma "Track Your Complaint" → GET /public/:slug/grievances/:trackingCode. The design also offers a
 * lookup by mobile number; the API only accepts the tracking code, so the field takes the code only.
 */
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
    <div className="h-full rounded-[10px] bg-white px-6 py-8 shadow-[0_0_10px_rgba(0,0,0,0.12)]">
      <form onSubmit={lookup} noValidate>
        <label htmlFor="grievance-track-code" className="text-[18px] font-semibold text-black">
          {t("trackLabel")}
        </label>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <input
            id="grievance-track-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("trackPlaceholder")}
            aria-invalid={!!error}
            className="h-[58px] flex-1 rounded-[8px] border border-black/15 bg-white px-4 text-[16px] text-black placeholder:text-[#414141]/60 focus:border-[#135130] focus:outline-none"
          />
          <button type="submit" disabled={loading} className="inline-flex h-[58px] items-center justify-center gap-3 rounded-[8px] bg-[#135130] px-7 text-[18px] font-semibold text-white hover:opacity-90 disabled:opacity-60 sm:min-w-[204px]">
            {t("trackStatus")}
            <Search aria-hidden className="size-6" />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-[13px] text-red-700">
            {error}
          </p>
        )}
      </form>
      {result && (
        <div className="mt-5 border-t border-black/10 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-semibold text-black">{result.trackingCode}</span>
            <StatusPill status={result.status} label={ta(`grievanceStatus.${result.status}`)} />
            <span className="text-xs text-[#414141]">{(CATEGORIES as readonly string[]).includes(result.category) ? t(`categories.${result.category}`) : result.category}</span>
          </div>
          {result.resolutionNote && <p className="mt-3 rounded-[8px] bg-[#eef5ee] px-4 py-3 text-sm text-black">{result.resolutionNote}</p>}
          <ol className="mt-4 grid gap-2 text-sm">
            {result.timeline.map((e, i) => (
              <li key={i} className="flex items-center gap-3">
                <span aria-hidden className="size-2 rounded-full bg-[#135130]" />
                <span className="font-semibold text-black">{ta(`grievanceStatus.${e.status}`)}</span>
                <span className="text-xs text-[#414141]">{formatDateTime(e.at, locale)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
