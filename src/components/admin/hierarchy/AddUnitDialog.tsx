"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { AdminUnitDto, AdminUnitLevel } from "@/types/api";
import { createUnitSchema } from "@/features/hierarchy/validators";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { childLevels, hierarchy } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

type FormValues = z.input<typeof createUnitSchema>;

/** Figma "Add New Taluka" modal, generalised to any child level of the current unit. */
export function AddUnitDialog({ parent }: { parent: AdminUnitDto | null }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const levels: AdminUnitLevel[] = parent ? childLevels(parent.level) : ["STATE"];

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: { level: levels[0], parentId: parent?.id ?? null, slug: "", nameEn: "", nameMr: "", code: null },
  });

  function close() {
    setOpen(false);
    setFormError(null);
    reset();
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const unit = await hierarchy.create({ ...values, parentId: parent?.id ?? null, code: values.code || null } as Parameters<typeof hierarchy.create>[0]);
      close();
      router.push(`/admin/hierarchy?parentId=${unit.parentId ?? ""}`);
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError(i.path as keyof FormValues, { message: i.message });
        return;
      }
      setFormError(err instanceof Error ? err.message : tc("errorGeneric"));
    }
  }

  if (levels.length === 0) return null;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> {t("hierarchy.addLevel", { level: t(`level.${levels[0]}`) })}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t("hierarchy.addUnit")}
        description={parent ? `${t("hierarchy.parent")}: ${parent.nameEn}` : undefined}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="add-unit-form" loading={isSubmitting}>
              {tc("save")}
            </Button>
          </>
        }
      >
        <form id="add-unit-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t("hierarchy.levelField")}
            options={levels.map((l) => ({ value: l, label: t(`level.${l}`) }))}
            error={errors.level?.message}
            {...register("level")}
          />
          <Input label={t("hierarchy.unitCode")} placeholder="e.g. 27-521" error={errors.code?.message} {...register("code")} />
          <Input label={t("hierarchy.nameEn")} error={errors.nameEn?.message} {...register("nameEn")} />
          <Input label={t("hierarchy.nameMr")} lang="mr" error={errors.nameMr?.message} {...register("nameMr")} />
          <div className="sm:col-span-2">
            <Input label={t("hierarchy.slug")} hint={t("hierarchy.slugHint")} error={errors.slug?.message} {...register("slug")} />
          </div>
          {formError && (
            <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger sm:col-span-2">
              {formError}
            </p>
          )}
        </form>
      </Dialog>
    </>
  );
}
