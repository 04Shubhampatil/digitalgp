"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, House, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { AdminUnitDto, AssignmentDto } from "@/types/api";
import { MAX_WEBSITE_OPERATORS, createTenantSchema } from "@/features/tenants/validators";
import { AccountFields } from "@/components/admin/websites/AccountFields";
import {
  accountShape,
  checkTypedPassword,
  emptyAccount,
  emptyOperator,
  toAccountBody,
  translateServerMessage,
  type AccountMessages,
  type AccountValues,
  type OperatorValues,
} from "@/components/admin/websites/accountForm";
import { ModuleGrants } from "@/components/admin/websites/ModuleGrants";
import { TempPasswordList, type TempPasswordEntry } from "@/components/admin/websites/TempPasswordList";
import { UnitPicker } from "@/components/admin/UnitPicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { tenants } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

type FormValues = Pick<z.input<typeof createTenantSchema>, "unitId" | "slug" | "nameEn" | "nameMr" | "defaultLocale"> & {
  gpAdmin: AccountValues;
  operators: OperatorValues[];
};

function buildSchema(m: AccountMessages) {
  const account = accountShape(m);
  return createTenantSchema
    .pick({ unitId: true, slug: true, nameEn: true, nameMr: true, defaultLocale: true })
    .extend({
      gpAdmin: z.object(account),
      operators: z.array(z.object({ ...account, modules: z.array(z.object({ moduleKey: z.string(), canWrite: z.boolean() })).min(1, m.modules) })).max(MAX_WEBSITE_OPERATORS),
    })
    .superRefine((v, ctx) => {
      checkTypedPassword(v.gpAdmin, ["gpAdmin"], ctx, m);
      v.operators.forEach((o, i) => checkTypedPassword(o, ["operators", i], ctx, m));
    });
}

type FieldErrs<T> = Partial<Record<keyof T, { message?: string }>>;

/**
 * One-step "Create GP Website": pick the Gram Panchayat, confirm slug + names, set the GP Admin account and optional
 * Data Entry Operators → POST /tenants/with-users (all created together, or nothing is). Temporary passwords are
 * shown once afterwards with a copy button.
 */
export function CreateWebsiteDialog({
  assignments,
  unit,
  area,
  compact,
  defaultOpen,
}: {
  assignments: AssignmentDto[];
  /** Gram Panchayat chosen in the list: the picker is skipped. */
  unit?: AdminUnitDto;
  /** "District / Taluka" text shown for a chosen Gram Panchayat. */
  area?: string;
  /** Small button used inside table rows. */
  compact?: boolean;
  /** Open straight away (the dashboard quick action links here). */
  defaultOpen?: boolean;
}) {
  const t = useTranslations("admin");
  const ts = useTranslations("admin.websiteSetup");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(!!defaultOpen);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ tenantId: string; entries: TempPasswordEntry[] } | null>(null);

  const messages: AccountMessages = useMemo(
    () => ({ required: tc("required"), email: ts("errEmail"), phone: ts("errPhone"), password: ts("errPassword"), modules: ts("modulesRequired") }),
    [tc, ts],
  );
  const schema = useMemo(() => buildSchema(messages), [messages]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: { unitId: "", slug: "", nameEn: "", nameMr: "", defaultLocale: "MR", gpAdmin: emptyAccount(), operators: [] },
  });
  const operators = useFieldArray({ control, name: "operators" });
  const adminGenerate = useWatch({ control, name: "gpAdmin.generate" });
  const operatorValues = useWatch({ control, name: "operators" });

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

  function finish() {
    // The dialog also fires onClose once it is dismissed here; only the first call may navigate.
    if (!created) return;
    const id = created.tenantId;
    setCreated(null);
    router.push(`/admin/websites/${id}`);
    router.refresh();
  }

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const res = await tenants.createWithUsers({
        unitId: values.unitId,
        slug: values.slug,
        nameEn: values.nameEn,
        nameMr: values.nameMr,
        defaultLocale: values.defaultLocale,
        gpAdmin: toAccountBody(values.gpAdmin),
        operators: values.operators.map((o) => ({ ...toAccountBody(o), modules: o.modules })),
      } as Parameters<typeof tenants.createWithUsers>[0]);
      const entries: TempPasswordEntry[] = [
        { label: `${res.gpAdmin.user.name} · ${t("role.GP_ADMIN")}`, email: res.gpAdmin.user.email, password: res.gpAdmin.temporaryPassword },
        ...res.operators.map((o) => ({ label: `${o.user.name} · ${t("role.DATA_ENTRY_OPERATOR")}`, email: o.user.email, password: o.temporaryPassword })),
      ];
      setOpen(false);
      reset();
      if (entries.some((e) => e.password)) setCreated({ tenantId: res.tenant.id, entries });
      else {
        router.push(`/admin/websites/${res.tenant.id}`);
        router.refresh();
      }
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        let general = false;
        for (const i of err.issues) {
          const message = translateServerMessage(i.message, ts, tc("errorGeneric"));
          if (i.path) setError(i.path as never, { message });
          else general = true;
        }
        if (general) setFormError(tc("errorGeneric"));
        return;
      }
      if (isApiError(err, "CONFLICT")) return setFormError(translateServerMessage(err.message, ts, tc("errorGeneric")));
      if (isApiError(err, "FORBIDDEN")) return setFormError(ts("noPermission"));
      setFormError(tc("errorGeneric"));
    }
  }

  const errs = errors as unknown as {
    gpAdmin?: FieldErrs<AccountValues>;
    operators?: (FieldErrs<OperatorValues> | undefined)[];
  };

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
        size="lg"
        title={unit ? t("websites.createQuestion") : t("websites.create")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="create-website-form" loading={isSubmitting}>
              {ts("createAll")}
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
          {unit && errors.slug?.message && (
            <p role="alert" className="text-xs text-danger">
              {errors.slug.message}
            </p>
          )}

          <section className="rounded-card border border-line p-4">
            <h3 className="text-[15px] font-bold text-ink">{ts("gpAdminTitle")}</h3>
            <p className="mt-1 mb-4 text-xs text-muted">{ts("gpAdminHint")}</p>
            <AccountFields reg={(f) => register(`gpAdmin.${f}`)} generate={adminGenerate} errors={errs.gpAdmin} />
          </section>

          <section className="rounded-card border border-line p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-ink">{ts("operatorsTitle")}</h3>
                <p className="mt-1 text-xs text-muted">{ts("operatorsHint")}</p>
              </div>
              {operators.fields.length < MAX_WEBSITE_OPERATORS && (
                <Button variant="secondary" size="sm" onClick={() => operators.append(emptyOperator())}>
                  <Plus className="size-4" aria-hidden /> {ts("addOperator")}
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-4">
              {operators.fields.map((f, i) => (
                <div key={f.id} className="grid gap-4 rounded-card border border-line bg-surface-soft p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-ink">{ts("operatorN", { n: i + 1 })}</p>
                    <Button variant="secondary" size="sm" onClick={() => operators.remove(i)}>
                      <Trash2 className="size-4" aria-hidden /> {ts("removeOperator")}
                    </Button>
                  </div>
                  <AccountFields reg={(field) => register(`operators.${i}.${field}`)} generate={operatorValues?.[i]?.generate ?? true} errors={errs.operators?.[i]} />
                  <Controller
                    control={control}
                    name={`operators.${i}.modules`}
                    render={({ field }) => <ModuleGrants value={field.value} onChange={field.onChange} error={errs.operators?.[i]?.modules?.message} />}
                  />
                </div>
              ))}
            </div>
          </section>

          {formError && (
            <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
              {formError}
            </p>
          )}
        </form>
      </Dialog>

      <Dialog open={!!created} onClose={finish} title={ts("createdTitle")} closeLabel={tc("close")} size="md" footer={<Button onClick={finish}>{ts("openWebsite")}</Button>}>
        <p className="mb-4 text-sm text-muted">{ts("createdHint")}</p>
        {created && <TempPasswordList entries={created.entries} />}
      </Dialog>
    </>
  );
}
