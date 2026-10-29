"use client";

import { useTranslations } from "next-intl";
import { Controller, type Control } from "react-hook-form";
import type { FieldSpec } from "@/config/section-editors";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { FormRecord } from "@/lib/section-data";
import { MediaField } from "./MediaField";

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

  if (spec.type === "image") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => <MediaField label={label} value={String(field.value ?? "")} onChange={field.onChange} tenantId={tenantId} error={error} disabled={disabled} compact={compact} />}
      />
    );
  }

  const inputType = spec.type === "number" || spec.type === "integer" ? "number" : spec.type === "email" ? "email" : spec.type === "phone" ? "tel" : spec.type === "href" ? "url" : "text";
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
