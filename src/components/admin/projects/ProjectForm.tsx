"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { ProjectDto } from "@/types/api";
import { MediaField } from "@/components/admin/editor/MediaField";
import { TenantSelect } from "@/components/admin/TenantSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { projects } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

const STAGES = ["UPCOMING", "ONGOING", "COMPLETED"] as const;

const schema = z
  .object({
    tenantId: z.string().min(1, "Required"),
    stage: z.enum(STAGES),
    nameEn: z.string().trim().max(200),
    nameMr: z.string().trim().max(200),
    descriptionEn: z.string().trim().max(20_000),
    descriptionMr: z.string().trim().max(20_000),
    wardNo: z.string().trim().max(20),
    year: z.string().trim().regex(/^(19[5-9]\d|20\d\d|2100)?$/, "Year between 1950 and 2100"),
    budget: z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, "Amount with up to 2 decimals"),
    familiesBenefited: z.string().trim().regex(/^\d*$/, "Whole number"),
    outcomeEn: z.string().trim().max(20_000),
    outcomeMr: z.string().trim().max(20_000),
    coverImageId: z.string(),
  })
  .refine((v) => !!(v.nameEn || v.nameMr), { message: "A name in English or Marathi is required", path: ["nameEn"] });
type FormValues = z.infer<typeof schema>;
const nz = (s: string) => (s ? s : null);
const nn = (s: string) => (s ? Number(s) : null);

/** Project create/edit → POST/PATCH /projects (always owned by one website). */
export function ProjectForm({ existing }: { existing?: ProjectDto }) {
  const t = useTranslations("admin");
  const tp = useTranslations("public");
  const tc = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          tenantId: existing.tenantId,
          stage: existing.stage,
          nameEn: existing.nameEn ?? "",
          nameMr: existing.nameMr ?? "",
          descriptionEn: existing.descriptionEn ?? "",
          descriptionMr: existing.descriptionMr ?? "",
          wardNo: existing.wardNo ?? "",
          year: existing.year?.toString() ?? "",
          budget: existing.budget ?? "",
          familiesBenefited: existing.familiesBenefited?.toString() ?? "",
          outcomeEn: existing.outcomeEn ?? "",
          outcomeMr: existing.outcomeMr ?? "",
          coverImageId: existing.coverImageId ?? "",
        }
      : { tenantId: "", stage: "ONGOING", nameEn: "", nameMr: "", descriptionEn: "", descriptionMr: "", wardNo: "", year: "", budget: "", familiesBenefited: "", outcomeEn: "", outcomeMr: "", coverImageId: "" },
  });
  const { register, handleSubmit, control, setError, formState } = form;
  const tenantId = useWatch({ control, name: "tenantId" });

  async function onSubmit(v: FormValues) {
    setFormError(null);
    const body = {
      stage: v.stage,
      nameEn: nz(v.nameEn),
      nameMr: nz(v.nameMr),
      descriptionEn: nz(v.descriptionEn),
      descriptionMr: nz(v.descriptionMr),
      wardNo: nz(v.wardNo),
      year: nn(v.year),
      budget: nn(v.budget),
      familiesBenefited: nn(v.familiesBenefited),
      outcomeEn: nz(v.outcomeEn),
      outcomeMr: nz(v.outcomeMr),
      coverImageId: nz(v.coverImageId),
    };
    try {
      const saved = existing ? await projects.update(existing.id, body) : await projects.create({ ...body, tenantId: v.tenantId });
      router.push(`/admin/projects/${saved.id}`);
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
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-4 text-[17px] font-bold text-ink">{t("projects")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {!existing && (
            <Controller control={control} name="tenantId" render={({ field }) => <TenantSelect label={t("announcements.tenant")} value={field.value} onChange={(id) => field.onChange(id)} error={formState.errors.tenantId?.message} />} />
          )}
          <Select label={t("projectsUi.stage")} options={STAGES.map((s) => ({ value: s, label: tp(`projectStage.${s}`) }))} {...register("stage")} />
          <Input label={t("schemesUi.nameEn")} error={formState.errors.nameEn?.message} {...register("nameEn")} />
          <Input label={t("schemesUi.nameMr")} lang="mr" error={formState.errors.nameMr?.message} {...register("nameMr")} />
          <Textarea label={t("schemesUi.descriptionEn")} rows={4} {...register("descriptionEn")} />
          <Textarea label={t("schemesUi.descriptionMr")} lang="mr" rows={4} {...register("descriptionMr")} />
          <Input label={`${tp("ward")} (${tc("optional")})`} {...register("wardNo")} />
          <Input label={`${t("projectsUi.year")} (${tc("optional")})`} inputMode="numeric" error={formState.errors.year?.message} {...register("year")} />
          <Input label={`${tp("budget")} (₹, ${tc("optional")})`} inputMode="decimal" error={formState.errors.budget?.message} {...register("budget")} />
          <Input label={`${tp("familiesBenefited")} (${tc("optional")})`} inputMode="numeric" error={formState.errors.familiesBenefited?.message} {...register("familiesBenefited")} />
          <Textarea label={t("projectsUi.outcomeEn")} rows={3} {...register("outcomeEn")} />
          <Textarea label={t("projectsUi.outcomeMr")} lang="mr" rows={3} {...register("outcomeMr")} />
          <div className="sm:col-span-2">
            {tenantId ? (
              <Controller control={control} name="coverImageId" render={({ field }) => <MediaField label={t("projectsUi.coverImage")} value={field.value} onChange={field.onChange} tenantId={tenantId} />} />
            ) : (
              <p className="text-xs text-muted">{t("projectsUi.pickWebsiteFirst")}</p>
            )}
          </div>
        </div>
      </section>
      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="flex items-center justify-end gap-3">
        <Link href={existing ? `/admin/projects/${existing.id}` : "/admin/projects"} className="text-sm font-semibold text-muted hover:text-ink">
          {tc("cancel")}
        </Link>
        <Button type="submit" loading={formState.isSubmitting}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
