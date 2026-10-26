"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { AdminUnitDto, AnnouncementDto, AssignmentDto } from "@/types/api";
import { PAGE_KEYS, type PageKey } from "@/config/pages";
import { TenantSelect } from "@/components/admin/TenantSelect";
import { UnitPicker } from "@/components/admin/UnitPicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { announcements } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";

const PRIORITIES = ["NORMAL", "IMPORTANT", "URGENT", "EMERGENCY"] as const;

const schema = z
  .object({
    kind: z.enum(["tenant", "shared"]),
    tenantId: z.string(),
    ownerUnitId: z.string(),
    category: z.string().trim().min(1).max(60),
    priority: z.enum(PRIORITIES),
    titleEn: z.string().trim().max(200),
    titleMr: z.string().trim().max(200),
    bodyEn: z.string().trim().max(20_000),
    bodyMr: z.string().trim().max(20_000),
    displayPages: z.array(z.enum(PAGE_KEYS)).min(1),
    publishAt: z.string(),
    expiresAt: z.string(),
  })
  .refine((v) => !!(v.titleEn || v.titleMr), { message: "A title in English or Marathi is required", path: ["titleEn"] })
  .refine((v) => (v.kind === "tenant" ? !!v.tenantId : !!v.ownerUnitId), { message: "Required", path: ["tenantId"] });
type FormValues = z.infer<typeof schema>;

export interface AnnouncementFormProps {
  assignments: AssignmentDto[];
  capabilities: string[];
  /** When set, the form edits this announcement (PATCH) instead of creating. */
  existing?: AnnouncementDto;
}

/** Figma "Publish Announcement" modal as a page: scope, content, pages and schedule → POST/PATCH /announcements. */
export function AnnouncementForm({ assignments, capabilities, existing }: AnnouncementFormProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [owner, setOwner] = useState<AdminUnitDto | null>(null);

  const canShare = capabilities.includes("content:share");
  const canEditGp = capabilities.includes("content:edit");
  const editing = !!existing;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          kind: existing.tenantId ? "tenant" : "shared",
          tenantId: existing.tenantId ?? "",
          ownerUnitId: existing.tenantId ? "" : existing.ownerUnitId,
          category: existing.category,
          priority: existing.priority,
          titleEn: existing.titleEn ?? "",
          titleMr: existing.titleMr ?? "",
          bodyEn: existing.bodyEn ?? "",
          bodyMr: existing.bodyMr ?? "",
          displayPages: existing.displayPages.filter((p): p is PageKey => (PAGE_KEYS as readonly string[]).includes(p)),
          publishAt: toDateTimeLocal(existing.publishAt),
          expiresAt: toDateTimeLocal(existing.expiresAt),
        }
      : {
          kind: canEditGp ? "tenant" : "shared",
          tenantId: "",
          ownerUnitId: "",
          category: "",
          priority: "NORMAL",
          titleEn: "",
          titleMr: "",
          bodyEn: "",
          bodyMr: "",
          displayPages: ["home", "announcements"],
          publishAt: "",
          expiresAt: "",
        },
  });
  const { register, handleSubmit, control, setValue, setError, formState } = form;
  const kind = useWatch({ control, name: "kind" });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const base = {
      category: values.category,
      priority: values.priority,
      titleEn: values.titleEn || null,
      titleMr: values.titleMr || null,
      bodyEn: values.bodyEn || null,
      bodyMr: values.bodyMr || null,
      displayPages: values.displayPages,
      publishAt: fromDateTimeLocal(values.publishAt),
      expiresAt: fromDateTimeLocal(values.expiresAt),
    };
    try {
      let saved: AnnouncementDto;
      if (existing) {
        saved = await announcements.update(existing.id, base);
      } else if (values.kind === "tenant") {
        saved = await announcements.create({ ...base, tenantId: values.tenantId });
      } else {
        saved = await announcements.create({ ...base, ownerUnitId: values.ownerUnitId, targetUnitIds: [values.ownerUnitId] });
      }
      router.push(`/admin/announcements/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError((i.path in values ? i.path : "titleEn") as keyof FormValues, { message: i.message });
        return;
      }
      setFormError(err instanceof Error ? err.message : tc("errorGeneric"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      {!editing && (
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="mb-4 text-[17px] font-bold text-ink">{t("announcements.scopeKind")}</h2>
          <div className="grid gap-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {canEditGp && (
                <label className="flex items-center gap-2">
                  <input type="radio" value="tenant" className="accent-primary" {...register("kind")} /> {t("announcements.gpOwned")}
                </label>
              )}
              {canShare && (
                <label className="flex items-center gap-2">
                  <input type="radio" value="shared" className="accent-primary" {...register("kind")} /> {t("announcements.shared")}
                </label>
              )}
            </div>
            {kind === "tenant" ? (
              <Controller
                control={control}
                name="tenantId"
                render={({ field }) => (
                  <TenantSelect label={t("announcements.tenant")} value={field.value} onChange={(id) => field.onChange(id)} error={formState.errors.tenantId?.message} />
                )}
              />
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
        <h2 className="mb-4 text-[17px] font-bold text-ink">{t("announcements.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("announcements.category")} placeholder="meeting, scheme, notice…" error={formState.errors.category?.message} {...register("category")} />
          <Select label={t("announcements.priority")} options={PRIORITIES.map((p) => ({ value: p, label: t(`announcements.priorityLabel.${p}`) }))} {...register("priority")} />
          <Input label={t("announcements.titleEn")} error={formState.errors.titleEn?.message} {...register("titleEn")} />
          <Input label={t("announcements.titleMr")} lang="mr" error={formState.errors.titleMr?.message} {...register("titleMr")} />
          <Textarea label={t("announcements.bodyEn")} rows={6} error={formState.errors.bodyEn?.message} {...register("bodyEn")} />
          <Textarea label={t("announcements.bodyMr")} lang="mr" rows={6} error={formState.errors.bodyMr?.message} {...register("bodyMr")} />
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-4 text-[17px] font-bold text-ink">{t("announcements.displayPages")}</h2>
        <Controller
          control={control}
          name="displayPages"
          render={({ field }) => (
            <ul className="grid gap-2 sm:grid-cols-3">
              {PAGE_KEYS.map((key) => (
                <li key={key}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={field.value.includes(key)}
                      onChange={(e) => field.onChange(e.target.checked ? [...field.value, key] : field.value.filter((k) => k !== key))}
                    />
                    {t(`pageNames.${key}`)}
                  </label>
                </li>
              ))}
            </ul>
          )}
        />
        {formState.errors.displayPages && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {formState.errors.displayPages.message}
          </p>
        )}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label={`${t("announcements.publishAt")} (${tc("optional")})`} type="datetime-local" {...register("publishAt")} />
          <Input label={`${t("announcements.expiresAt")} (${tc("optional")})`} type="datetime-local" {...register("expiresAt")} />
        </div>
      </section>

      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href={existing ? `/admin/announcements/${existing.id}` : "/admin/announcements"} className="text-sm font-semibold text-muted hover:text-ink">
          {tc("cancel")}
        </Link>
        <Button type="submit" loading={formState.isSubmitting}>
          {tc("save")}
        </Button>
      </div>
    </form>
  );
}
