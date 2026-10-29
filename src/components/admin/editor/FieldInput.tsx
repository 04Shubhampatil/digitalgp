"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, type Control } from "react-hook-form";
import type { FieldSpec } from "@/config/section-editors";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/cn";
import type { FormRecord } from "@/lib/section-data";
import { MediaField } from "./MediaField";

type Bilingual = { en?: string; mr?: string };

/**
 * Renders one spec field at `path` (dotted) inside a react-hook-form `control`.
 * `compact` is the table-cell variant used by item rows: no visible label (the column header
 * names it), 40px inputs, English and Marathi stacked.
 */
export function FieldInput({
  spec,
  path,
  control,
  tenantId,
  error,
  disabled,
  compact,
}: {
  spec: FieldSpec;
  path: string;
  control: Control<FormRecord>;
  tenantId: string;
  error?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("editor");
  const label = t(`fields.${spec.labelKey}`) + (spec.required ? " *" : "");
  const optionLabel = (v: string) => (t.has(`options.${v}`) ? t(`options.${v}`) : v);

  if (spec.type === "bilingual" || spec.type === "bilingualLong") {
    const long = spec.type === "bilingualLong";
    const cell = (lang: "en" | "mr") => {
      const name = `${path}.${lang}`;
      const text = `${label} · ${lang === "en" ? "English" : "मराठी"}`;
      return (
        <Controller
          key={lang}
          control={control}
          name={name}
          render={({ field }) =>
            long ? (
              <Textarea
                label={compact ? undefined : text}
                aria-label={text}
                rows={compact ? 2 : 4}
                className={compact ? "px-3 py-2 text-[13px]" : undefined}
                lang={lang === "mr" ? "mr" : undefined}
                value={String(field.value ?? "")}
                onChange={field.onChange}
                maxLength={spec.max}
                disabled={disabled}
                error={lang === "en" ? error : undefined}
              />
            ) : (
              <Input
                compact={compact}
                label={text}
                aria-label={compact ? text : undefined}
                placeholder={compact ? (lang === "en" ? "English" : "मराठी") : undefined}
                lang={lang === "mr" ? "mr" : undefined}
                value={String(field.value ?? "")}
                onChange={field.onChange}
                maxLength={spec.max}
                disabled={disabled}
                error={lang === "en" ? error : undefined}
              />
            )
          }
        />
      );
    };
    return <div className={compact ? "grid gap-2" : "grid gap-3 sm:grid-cols-2"}>{cell("en")}{cell("mr")}</div>;
  }

  if (spec.type === "image" || spec.type === "file") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => <MediaField label={label} value={String(field.value ?? "")} onChange={field.onChange} tenantId={tenantId} error={error} disabled={disabled} compact={compact} anyFile={spec.type === "file"} />}
      />
    );
  }

  if (spec.type === "boolean") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => (
          <div className="flex min-h-10 items-center">
            <Switch checked={field.value === true} onChange={field.onChange} disabled={disabled} label={label} hideLabel={compact} />
          </div>
        )}
      />
    );
  }

  if (spec.type === "select") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => {
          const value = String(field.value ?? "");
          const options = spec.options ?? [];
          return (
            <div className="flex flex-col gap-1.5">
              {!compact && <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>}
              {spec.segmented ? (
                <div role="radiogroup" aria-label={label} className={cn("grid gap-2", options.length === 4 ? "grid-cols-2 sm:grid-cols-4" : options.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
                  {options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={value === o}
                      disabled={disabled}
                      onClick={() => field.onChange(o)}
                      className={cn("rounded-input border px-3 py-2.5 text-sm font-semibold capitalize transition-colors disabled:opacity-50", value === o ? "border-primary bg-success-soft text-primary" : "border-line bg-surface text-muted hover:bg-surface-soft")}
                    >
                      {optionLabel(o)}
                    </button>
                  ))}
                </div>
              ) : (
                <select
                  aria-label={label}
                  value={value}
                  disabled={disabled}
                  onChange={(e) => field.onChange(e.target.value)}
                  className={cn("w-full rounded-input border border-line bg-surface text-ink-strong outline-none focus:border-primary", compact ? "h-10 px-2 text-[13px]" : "h-13 px-4 text-[15px]")}
                >
                  {!spec.required && <option value="" />}
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {optionLabel(o)}
                    </option>
                  ))}
                </select>
              )}
              {error && (
                <p role="alert" className="text-xs text-danger">
                  {error}
                </p>
              )}
            </div>
          );
        }}
      />
    );
  }

  if (spec.type === "multiSelect") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => {
          const current = Array.isArray(field.value) ? (field.value as string[]) : [];
          return (
            <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
              <legend className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</legend>
              <div className="flex flex-wrap gap-3">
                {(spec.options ?? []).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" className="size-4 accent-primary" checked={current.includes(o)} onChange={(e) => field.onChange(e.target.checked ? [...current, o] : current.filter((v) => v !== o))} />
                    {optionLabel(o)}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        }}
      />
    );
  }

  if (spec.type === "colour") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => {
          const value = String(field.value ?? "");
          return (
            <Input
              compact={compact}
              label={label}
              placeholder="#1F7A4D"
              maxLength={7}
              value={value}
              onChange={field.onChange}
              disabled={disabled}
              error={error}
              leading={
                <input type="color" aria-label={label} value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"} onChange={(e) => field.onChange(e.target.value.toUpperCase())} disabled={disabled} className="size-6 cursor-pointer rounded border-0 bg-transparent p-0" />
              }
            />
          );
        }}
      />
    );
  }

  if (spec.type === "bilingualList") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => {
          const rows = Array.isArray(field.value) ? (field.value as Bilingual[]) : [];
          const set = (i: number, lang: "en" | "mr", v: string) => field.onChange(rows.map((r, j) => (j === i ? { ...r, [lang]: v } : r)));
          return (
            <div className="flex flex-col gap-2">
              <span className={cn("text-[11px] font-semibold tracking-wide text-muted uppercase", compact && "sr-only")}>{label}</span>
              {rows.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className={cn("grid flex-1 gap-2", !compact && "sm:grid-cols-2")}>
                    <Input compact label={`${label} ${i + 1} · English`} placeholder="English" value={r.en ?? ""} onChange={(e) => set(i, "en", e.target.value)} maxLength={spec.max && spec.max <= 200 ? 200 : 200} disabled={disabled} />
                    <Input compact label={`${label} ${i + 1} · मराठी`} placeholder="मराठी" lang="mr" value={r.mr ?? ""} onChange={(e) => set(i, "mr", e.target.value)} maxLength={200} disabled={disabled} />
                  </div>
                  <button type="button" aria-label={t("removeEntry")} disabled={disabled} onClick={() => field.onChange(rows.filter((_, j) => j !== i))} className="rounded p-2 text-danger hover:bg-danger-soft disabled:opacity-40">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={disabled || rows.length >= (spec.max ?? 10)}
                onClick={() => field.onChange([...rows, { en: "", mr: "" }])}
                className="inline-flex w-fit items-center gap-1.5 rounded-input border border-dashed border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-success-soft disabled:opacity-40"
              >
                <Plus className="size-3.5" aria-hidden /> {t("addEntry")}
              </button>
            </div>
          );
        }}
      />
    );
  }

  if (spec.type === "imageList") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => {
          const ids = Array.isArray(field.value) ? (field.value as string[]) : [];
          return (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {ids.map((id, i) => (
                  <MediaField key={`${id}-${i}`} compact label={`${label} ${i + 1}`} value={id} onChange={(v) => field.onChange(v ? ids.map((x, j) => (j === i ? v : x)) : ids.filter((_, j) => j !== i))} tenantId={tenantId} disabled={disabled} />
                ))}
              </div>
              <button
                type="button"
                disabled={disabled || ids.length >= (spec.max ?? 30)}
                onClick={() => field.onChange([...ids, ""])}
                className="inline-flex w-fit items-center gap-1.5 rounded-input border border-dashed border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-success-soft disabled:opacity-40"
              >
                <Plus className="size-3.5" aria-hidden /> {t("addImage")}
              </button>
            </div>
          );
        }}
      />
    );
  }

  const inputType =
    spec.type === "number" || spec.type === "integer"
      ? "number"
      : spec.type === "email"
        ? "email"
        : spec.type === "phone"
          ? "tel"
          : spec.type === "href"
            ? "url"
            : spec.type === "date"
              ? "date"
              : spec.type === "time"
                ? "time"
                : spec.type === "datetime"
                  ? "datetime-local"
                  : spec.type === "month"
                    ? "month"
                    : "text";
  return (
    <Controller
      control={control}
      name={path}
      render={({ field }) => (
        <Input
          compact={compact}
          label={label}
          type={inputType}
          inputMode={spec.type === "integer" ? "numeric" : spec.type === "number" ? "decimal" : undefined}
          step={spec.type === "number" ? "any" : spec.type === "integer" ? 1 : undefined}
          maxLength={spec.max}
          placeholder={spec.placeholder}
          value={String(field.value ?? "")}
          onChange={field.onChange}
          disabled={disabled}
          error={error}
        />
      )}
    />
  );
}
