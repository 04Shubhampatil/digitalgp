"use client";

import { useTranslations } from "next-intl";
import { Controller, type Control } from "react-hook-form";
import type { FieldSpec } from "@/config/section-editors";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { FormRecord } from "@/lib/section-data";
import { MediaField } from "./MediaField";

/** Renders one spec field at `path` (dotted) inside a react-hook-form `control`. */
export function FieldInput({
  spec,
  path,
  control,
  tenantId,
  error,
  disabled,
}: {
  spec: FieldSpec;
  path: string;
  control: Control<FormRecord>;
  tenantId: string;
  error?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("editor");
  const label = t(`fields.${spec.labelKey}`) + (spec.required ? " *" : "");

  if (spec.type === "bilingual" || spec.type === "bilingualLong") {
    const Comp = spec.type === "bilingual" ? Input : Textarea;
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name={`${path}.en`}
          render={({ field }) => <Comp label={`${label} · English`} value={String(field.value ?? "")} onChange={field.onChange} maxLength={spec.max} disabled={disabled} error={error} />}
        />
        <Controller
          control={control}
          name={`${path}.mr`}
          render={({ field }) => <Comp label={`${label} · मराठी`} lang="mr" value={String(field.value ?? "")} onChange={field.onChange} maxLength={spec.max} disabled={disabled} />}
        />
      </div>
    );
  }

  if (spec.type === "image") {
    return (
      <Controller
        control={control}
        name={path}
        render={({ field }) => <MediaField label={label} value={String(field.value ?? "")} onChange={field.onChange} tenantId={tenantId} error={error} disabled={disabled} />}
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
