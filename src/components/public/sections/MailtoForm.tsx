"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { isApiError } from "@/lib/api/client";
import { submitContactForm } from "@/lib/api/public";
import { Turnstile } from "@/components/public/Turnstile";

export interface MailtoField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "textarea" | "select";
  options?: string[];
  /** Grid column span on wide screens (1–4). */
  span?: number;
  required?: boolean;
}

export interface FormApi {
  slug: string;
  kind: "feedback" | "volunteers";
  /** Form field name -> API field name, where they differ (e.g. area -> category). */
  map?: Record<string, string>;
}

/**
 * Contact / volunteer form. With `api` it submits to the backend (the section must be published and
 * enabled). While the section is still design placeholder content the endpoint answers 404, and the
 * form opens the visitor's mail app addressed to the Gram Panchayat instead.
 */
export function MailtoForm({ to, subject, fields, submitLabel, hint, columns = 2, api }: { to: string; subject: string; fields: MailtoField[]; submitLabel: string; hint?: string; columns?: 2 | 4; api?: FormApi }) {
  const t = useTranslations("common");
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  function openMail(fd: FormData) {
    const body = fields.map((f) => `${f.label}: ${String(fd.get(f.name) ?? "").trim()}`).join("\n");
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (!api) return openMail(fd);
    setError(null);
    setBusy(true);
    try {
      const body: Record<string, string | null> = { website: String(fd.get("website") ?? "") };
      if (token) body.turnstileToken = token;
      for (const f of fields) {
        const v = String(fd.get(f.name) ?? "").trim();
        if (v) body[api.map?.[f.name] ?? f.name] = v;
      }
      const r = await submitContactForm(api.slug, api.kind, body);
      setDone(r.message);
      form.reset();
    } catch (err) {
      if (isApiError(err, "NOT_FOUND")) openMail(fd);
      else if (isApiError(err, "VALIDATION_ERROR")) setError(err.issues.map((i) => i.message).join(" "));
      else setError(err instanceof Error ? err.message : t("errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p role="status" className="rounded-[8px] bg-[#e8f1ea] px-4 py-4 text-center text-[15px] font-medium text-[#135130]">
        {done}
      </p>
    );
  }
  const base = "w-full rounded-[8px] border border-black/25 bg-white px-4 py-3 text-[14px] text-black placeholder:text-[#8a8a8a] focus:border-[#135130] focus:outline-none";
  return (
    <form method="post" onSubmit={onSubmit} className={`grid gap-x-6 gap-y-4 ${columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
      {fields.map((f) => (
        <label key={f.name} className={`flex flex-col gap-1.5 text-[14px] font-medium text-black ${f.span === 2 ? "lg:col-span-2" : f.span === 3 ? "lg:col-span-3" : f.span && f.span >= 4 ? "sm:col-span-full" : ""}`}>
          {f.label}
          {f.type === "textarea" ? (
            <textarea name={f.name} rows={5} required={f.required} placeholder={f.placeholder} className={base} />
          ) : f.type === "select" ? (
            <select name={f.name} required={f.required} defaultValue="" className={base}>
              <option value="" disabled>
                {f.placeholder}
              </option>
              {(f.options ?? []).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input name={f.name} type={f.type ?? "text"} required={f.required} placeholder={f.placeholder} className={base} />
          )}
        </label>
      ))}
      {api && <Turnstile onToken={setToken} />}
      {api && <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />}
      <div className="flex flex-col gap-2 sm:col-span-full">
        {error && (
          <p role="alert" className="rounded-[8px] bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="w-full rounded-[8px] bg-[#135130] px-6 py-3.5 text-[16px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
          {submitLabel}
        </button>
        {sent && hint && (
          <p role="status" className="text-center text-[12px] text-[#414141]">
            {hint}
          </p>
        )}
      </div>
    </form>
  );
}
