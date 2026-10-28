"use client";

import { useState } from "react";

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

/**
 * Contact / volunteer form. The backend has no feedback or volunteer endpoint yet, so submitting
 * opens the visitor's mail app addressed to the Gram Panchayat with the answers filled in. Swap
 * `onSubmit` for an API call when the endpoint exists.
 */
export function MailtoForm({ to, subject, fields, submitLabel, hint, columns = 2 }: { to: string; subject: string; fields: MailtoField[]; submitLabel: string; hint?: string; columns?: 2 | 4 }) {
  const [sent, setSent] = useState(false);
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = fields.map((f) => `${f.label}: ${String(fd.get(f.name) ?? "").trim()}`).join("\n");
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }
  const base = "w-full rounded-[8px] border border-black/25 bg-white px-4 py-3 text-[14px] text-black placeholder:text-[#8a8a8a] focus:border-[#135130] focus:outline-none";
  return (
    <form onSubmit={onSubmit} className={`grid gap-x-6 gap-y-4 ${columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2"}`}>
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
      <div className="flex flex-col gap-2 sm:col-span-full">
        <button type="submit" className="w-full rounded-[8px] bg-[#135130] px-6 py-3.5 text-[16px] font-semibold text-white hover:opacity-90">
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
