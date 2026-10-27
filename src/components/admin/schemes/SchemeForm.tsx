"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { AdminUnitDto, AssignmentDto, SchemeDto } from "@/types/api";
import { TenantSelect } from "@/components/admin/TenantSelect";
import { UnitPicker } from "@/components/admin/UnitPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { schemes } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

const LEVELS = ["CENTRAL", "STATE", "DISTRICT", "GRAM_PANCHAYAT"] as const;
const num = z.string().trim();

const schema = z
  .object({
    kind: z.enum(["tenant", "shared"]),
    tenantId: z.string(),
    ownerUnitId: z.string(),
    level: z.enum(LEVELS),
    nameEn: z.string().trim().max(200),
    nameMr: z.string().trim().max(200),
    descriptionEn: z.string().trim().max(20_000),
    descriptionMr: z.string().trim().max(20_000),
    eligibilityEn: z.string().trim().max(20_000),
    eligibilityMr: z.string().trim().max(20_000),
    processEn: z.string().trim().max(20_000),
    processMr: z.string().trim().max(20_000),
    externalUrl: z.string().trim().url().max(2000).or(z.literal("")),
    beneficiaryCount: num.regex(/^\d*$/, "Whole number"),
    amountDisbursed: num.regex(/^(\d+(\.\d{1,2})?)?$/, "Amount with up to 2 decimals"),
  })
  .refine((v) => !!(v.nameEn || v.nameMr), { message: "A name in English or Marathi is required", path: ["nameEn"] })
  .refine((v) => (v.kind === "tenant" ? !!v.tenantId : !!v.ownerUnitId), { message: "Required", path: ["tenantId"] });
type FormValues = z.infer<typeof schema>;

const nz = (s: string) => (s ? s : null);
const nn = (s: string) => (s ? Number(s) : null);

/** Scheme create/edit → POST/PATCH /schemes (GP-owned via website, or shared via owner unit). */
export function SchemeForm({ assignments, capabilities, existing }: { assignments: AssignmentDto[]; capabilities: string[]; existing?: SchemeDto }) {
  const t = useTranslations("admin");
  const tp = useTranslations("public");
  const tc = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [owner, setOwner] = useState<AdminUnitDto | null>(null);
  const canShare = capabilities.includes("content:share");
  const canEditGp = capabilities.includes("content:edit");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          kind: existing.tenantId ? "tenant" : "shared",
          tenantId: existing.tenantId ?? "",
          ownerUnitId: existing.tenantId ? "" : existing.ownerUnitId,
          level: existing.level,
          nameEn: existing.nameEn ?? "",
          nameMr: existing.nameMr ?? "",
          descriptionEn: existing.descriptionEn ?? "",
          descriptionMr: existing.descriptionMr ?? "",
          eligibilityEn: existing.eligibilityEn ?? "",
          eligibilityMr: existing.eligibilityMr ?? "",
          processEn: existing.processEn ?? "",
          processMr: existing.processMr ?? "",
          externalUrl: existing.externalUrl ?? "",
          beneficiaryCount: existing.beneficiaryCount?.toString() ?? "",
          amountDisbursed: existing.amountDisbursed ?? "",
        }
      : {
          kind: canEditGp ? "tenant" : "shared",
          tenantId: "",
          ownerUnitId: "",
          level: "STATE",
          nameEn: "",
          nameMr: "",
          descriptionEn: "",
          descriptionMr: "",
          eligibilityEn: "",
          eligibilityMr: "",
          processEn: "",
          processMr: "",
          externalUrl: "",
          beneficiaryCount: "",
          amountDisbursed: "",
        },
  });
  const { register, handleSubmit, control, setValue, setError, formState } = form;
  const kind = useWatch({ control, name: "kind" });

  async function onSubmit(v: FormValues) {
    setFormError(null);
    const body = {
      level: v.level,
      nameEn: nz(v.nameEn),
      nameMr: nz(v.nameMr),
      descriptionEn: nz(v.descriptionEn),
      descriptionMr: nz(v.descriptionMr),
      eligibilityEn: nz(v.eligibilityEn),
      eligibilityMr: nz(v.eligibilityMr),
      processEn: nz(v.processEn),
      processMr: nz(v.processMr),
      externalUrl: nz(v.externalUrl),
      beneficiaryCount: nn(v.beneficiaryCount),
      amountDisbursed: nn(v.amountDisbursed),
    };
    try {
      const saved = existing
        ? await schemes.update(existing.id, body)
        : v.kind === "tenant"
          ? await schemes.create({ ...body, tenantId: v.tenantId })
          : await schemes.create({ ...body, ownerUnitId: v.ownerUnitId, targetUnitIds: [v.ownerUnitId] });
      router.push(`/admin/schemes/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError((i.path in v ? i.path : "nameEn") as keyof FormValues, { message: i.message });
        return;
      }
      setFormError(isApiError(err) ? err.message : tc("errorGeneric"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      {!existing && (
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[17px] font-bold text-ink">{t("announcements.scopeKind")}</h2>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {canEditGp && (
                <label className="flex items-center gap-2">
                  <input type="radio" value="tenant" className="accent-primary" {...register("kind")} /> {t("schemesUi.gpOwned")}
                </label>
              )}
              {canShare && (
                <label className="flex items-center gap-2">
                  <input type="radio" value="shared" className="accent-primary" {...register("kind")} /> {t("announcements.shared")}
                </label>
              )}
            </div>
            {kind === "tenant" ? (
              <Controller control={control} name="tenantId" render={({ field }) => <TenantSelect label={t("announcements.tenant")} value={field.value} onChange={(id) => field.onChange(id)} error={formState.errors.tenantId?.message} />} />
            ) : (
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("announcements.owner")}</p>
                <UnitPicker
                  assignments={assignments}
                  targetLevel="BLOCK"
                  allowIntermediate
                  onChange={(u) => {
                    setOwner(u);
                    setValue("ownerUnitId", u?.id ?? "", { shouldValidate: !!u });
                  }}
                  error={formState.errors.tenantId?.message}
                />
                <p className="mt-2 text-xs text-muted">{owner ? t("announcements.allUnder", { name: owner.nameEn }) : t("announcements.targetsHint")}</p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-4 text-[17px] font-bold text-ink">{t("schemes")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t("schemesUi.level")} options={LEVELS.map((l) => ({ value: l, label: tp(`schemeLevel.${l}`) }))} {...register("level")} />
          <Input label={`${t("schemesUi.externalUrl")} (${tc("optional")})`} type="url" placeholder="https://" error={formState.errors.externalUrl?.message} {...register("externalUrl")} />
          <Input label={t("schemesUi.nameEn")} error={formState.errors.nameEn?.message} {...register("nameEn")} />
          <Input label={t("schemesUi.nameMr")} lang="mr" error={formState.errors.nameMr?.message} {...register("nameMr")} />
          <Textarea label={t("schemesUi.descriptionEn")} rows={4} {...register("descriptionEn")} />
          <Textarea label={t("schemesUi.descriptionMr")} lang="mr" rows={4} {...register("descriptionMr")} />
          <Textarea label={t("schemesUi.eligibilityEn")} rows={3} {...register("eligibilityEn")} />
          <Textarea label={t("schemesUi.eligibilityMr")} lang="mr" rows={3} {...register("eligibilityMr")} />
          <Textarea label={t("schemesUi.processEn")} rows={3} {...register("processEn")} />
          <Textarea label={t("schemesUi.processMr")} lang="mr" rows={3} {...register("processMr")} />
          <Input label={`${tp("beneficiaries")} (${tc("optional")})`} inputMode="numeric" hint={t("schemesUi.aggregateHint")} error={formState.errors.beneficiaryCount?.message} {...register("beneficiaryCount")} />
          <Input label={`${tp("amountDisbursed")} (₹, ${tc("optional")})`} inputMode="decimal" error={formState.errors.amountDisbursed?.message} {...register("amountDisbursed")} />
        </div>
      </section>

      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        <Link href={existing ? `/admin/schemes/${existing.id}` : "/admin/schemes"} className="text-sm font-semibold text-muted hover:text-ink">
          {tc("cancel")}
        </Link>
        <Button type="submit" loading={formState.isSubmitting}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
