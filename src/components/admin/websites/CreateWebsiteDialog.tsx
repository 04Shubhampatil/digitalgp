"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, House, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AdminUnitDto, AssignmentDto } from "@/types/api";
import { createTenantSchema } from "@/features/tenants/validators";
import { UnitPicker } from "@/components/admin/UnitPicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { tenants } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

const formSchema = createTenantSchema.pick({ unitId: true, slug: true, nameEn: true, nameMr: true, defaultLocale: true });
type FormValues = z.input<typeof formSchema>;

/** Figma "Create GP Website": pick the Gram Panchayat, confirm slug + names → POST /tenants. */
export function CreateWebsiteDialog({ assignments, unit, area, compact }: { assignments: AssignmentDto[]; /** Gram Panchayat chosen in the list: the picker is skipped. */ unit?: AdminUnitDto; /** "District / Taluka" text shown for a chosen Gram Panchayat. */ area?: string; /** Small button used inside table rows. */ compact?: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { unitId: "", slug: "", nameEn: "", nameMr: "", defaultLocale: "MR" },
  });

  function close() {
    setOpen(false);
    setFormError(null);
    reset();
  }

  function onUnit(unit: AdminUnitDto | null) {
    setValue("unitId", unit?.id ?? "", { shouldValidate: !!unit });
    if (unit) {
      if (!getValues("slug")) setValue("slug", unit.slug);
      if (!getValues("nameEn")) setValue("nameEn", unit.nameEn);
      if (!getValues("nameMr")) setValue("nameMr", unit.nameMr);
    }
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const tenant = await tenants.create(values as Parameters<typeof tenants.create>[0]);
      close();
      router.push(`/admin/websites/${tenant.id}`);
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError(i.path as keyof FormValues, { message: i.message });
        return;
      }
      if (isApiError(err, "CONFLICT")) return setFormError(err.message);
      setFormError(err instanceof Error ? err.message : tc("errorGeneric"));
    }
  }

  return (
    <>
      <Button
        size={compact ? "sm" : undefined}
        onClick={() => {
          if (unit) onUnit(unit);
          setOpen(true);
        }}
      >
        {!compact && <Plus className="size-4" aria-hidden />} {t("websites.create")}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={unit ? t("websites.createQuestion") : t("websites.create")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="create-website-form" loading={isSubmitting}>
              {t("websites.create")}
            </Button>
          </>
        }
      >
        <form id="create-website-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {unit && (
            <div className="grid gap-4 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-soft text-primary">
                <House className="size-6" aria-hidden />
              </span>
              <p className="text-sm text-muted">{t("websites.createTemplate")}</p>
              <div className="grid gap-3 rounded-card border border-line bg-surface-soft p-4 text-left sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("websites.gp")}</p>
                  <p className="rounded-card border border-line-strong bg-surface px-3 py-2.5 text-sm font-medium text-ink">{unit.nameEn}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("websites.districtTaluka")}</p>
                  <p className="rounded-card border border-line-strong bg-surface px-3 py-2.5 text-sm font-medium text-ink">{area || "—"}</p>
                </div>
                <p className="flex items-center gap-2 text-xs font-medium text-primary sm:col-span-2">
                  <Check className="size-4" aria-hidden /> {t("websites.templateUnlocked")}
                </p>
              </div>
              <p className="text-xs text-muted">{t("websites.afterCreation")}</p>
            </div>
          )}
          {!unit && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("websites.unitLabel")}</p>
              {open && <UnitPicker assignments={assignments} targetLevel="GRAM_PANCHAYAT" onChange={onUnit} error={errors.unitId?.message} />}
            </div>
          )}
          <div className={unit ? "hidden" : "grid gap-4 sm:grid-cols-2"}>
            <Input label={t("hierarchy.nameEn")} error={errors.nameEn?.message} {...register("nameEn")} />
            <Input label={t("hierarchy.nameMr")} lang="mr" error={errors.nameMr?.message} {...register("nameMr")} />
            <Input label={t("hierarchy.slug")} hint={t("websites.slugHint")} error={errors.slug?.message} {...register("slug")} />
            <Select
              label={t("websites.defaultLocale")}
              options={[
                { value: "MR", label: tc("marathi") },
                { value: "EN", label: tc("english") },
              ]}
              {...register("defaultLocale")}
            />
          </div>
          {formError && (
            <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
              {formError}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}
