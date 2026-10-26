"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { AdminUnitLevel, AssignmentDto, ModuleKey, Role } from "@/types/api";
import { MODULE_KEYS } from "@/config/modules";
import { UnitPicker } from "@/components/admin/UnitPicker";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

/** Mirrors ROLE_LEVELS in src/lib/permissions.ts — the level a role is assigned at. */
const ROLE_LEVEL: Record<Role, AdminUnitLevel> = {
  SUPER_ADMIN: "DISTRICT",
  TALUKA_ADMIN: "TALUKA",
  BLOCK_ADMIN: "BLOCK",
  GP_ADMIN: "GRAM_PANCHAYAT",
  DATA_ENTRY_OPERATOR: "GRAM_PANCHAYAT",
};
const ROLES = Object.keys(ROLE_LEVEL) as Role[];

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().max(254).pipe(z.email()),
  phone: z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number").or(z.literal("")),
  locale: z.enum(["MR", "EN", "HI"]),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), "Password must contain letters and numbers")
    .or(z.literal("")),
  role: z.enum(ROLES as [Role, ...Role[]]),
  unitId: z.string().min(1, "Required"),
  modules: z.array(z.object({ moduleKey: z.enum(MODULE_KEYS), canWrite: z.boolean() })),
});
type FormValues = z.infer<typeof schema>;

/** Figma 09 "Create Block Admin" + 10 "Assign access", for every role the caller may grant. POST /users. */
export function CreateUserForm({ assignments }: { assignments: AssignmentDto[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<{ userId: string; temporaryPassword: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", locale: "MR", password: "", role: "GP_ADMIN", unitId: "", modules: [] },
  });
  const { register, handleSubmit, control, setValue, setError, formState } = form;
  const role = useWatch({ control, name: "role" });
  const isOperator = role === "DATA_ENTRY_OPERATOR";

  async function onSubmit(values: FormValues) {
    setFormError(null);
    if (isOperator && values.modules.length === 0) {
      setError("modules", { message: tc("required") });
      return;
    }
    try {
      const res = await users.create({
        name: values.name,
        email: values.email,
        phone: values.phone || null,
        locale: values.locale,
        ...(values.password ? { password: values.password } : {}),
        assignment: { role: values.role, unitId: values.unitId, ...(isOperator ? { modules: values.modules } : {}) },
      });
      setResult({ userId: res.user.id, temporaryPassword: res.temporaryPassword });
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) {
          const path = i.path.replace(/^assignment\./, "") as keyof FormValues;
          setError(path in values ? path : "unitId", { message: i.message });
        }
        return;
      }
      if (isApiError(err, "CONFLICT") || isApiError(err, "FORBIDDEN") || isApiError(err, "BAD_REQUEST")) return setFormError(err.message);
      setFormError(err instanceof Error ? err.message : tc("errorGeneric"));
    }
  }

  function finish() {
    const id = result?.userId;
    setResult(null);
    router.push(id ? `/admin/users/${id}` : "/admin/users");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-4 text-[17px] font-bold text-ink">{tc("name")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={tc("name")} autoComplete="off" error={formState.errors.name?.message} {...register("name")} />
          <Input label={t("users.email")} type="email" autoComplete="off" error={formState.errors.email?.message} {...register("email")} />
          <Input label={`${t("users.phone")} (${tc("optional")})`} type="tel" error={formState.errors.phone?.message} {...register("phone")} />
          <Select
            label={t("users.locale")}
            options={[
              { value: "MR", label: tc("marathi") },
              { value: "EN", label: tc("english") },
            ]}
            {...register("locale")}
          />
          <div className="sm:col-span-2">
            <Input
              label={`${t("users.password")} (${tc("optional")})`}
              type="password"
              autoComplete="new-password"
              hint={t("users.passwordHint")}
              error={formState.errors.password?.message}
              {...register("password")}
            />
          </div>
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-4 text-[17px] font-bold text-ink">{t("users.scope")}</h2>
        <div className="grid gap-4">
          <Select
            label={t("users.roleField")}
            options={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))}
            error={formState.errors.role?.message}
            {...register("role", {
              onChange: () => {
                setValue("unitId", "");
                setValue("modules", []);
              },
            })}
          />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
              {t("users.scope")} · {t(`level.${ROLE_LEVEL[role]}`)}
            </p>
            <UnitPicker
              key={role}
              assignments={assignments}
              targetLevel={ROLE_LEVEL[role]}
              allowIntermediate={role === "SUPER_ADMIN"}
              onChange={(u) => setValue("unitId", u?.id ?? "", { shouldValidate: !!u })}
              error={formState.errors.unitId?.message}
            />
          </div>
          {isOperator && (
            <Controller
              control={control}
              name="modules"
              render={({ field }) => (
                <fieldset>
                  <legend className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("users.modules")}</legend>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {MODULE_KEYS.map((key: ModuleKey) => {
                      const entry = field.value.find((m) => m.moduleKey === key);
                      return (
                        <li key={key} className="flex items-center justify-between rounded-input border border-line px-3 py-2 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={!!entry}
                              onChange={(e) =>
                                field.onChange(
                                  e.target.checked ? [...field.value, { moduleKey: key, canWrite: true }] : field.value.filter((m) => m.moduleKey !== key),
                                )
                              }
                            />
                            <span className="font-medium text-ink">{t(`moduleNames.${key}`)}</span>
                          </label>
                          {entry && (
                            <label className="flex items-center gap-1.5 text-xs text-muted">
                              <input
                                type="checkbox"
                                className="size-3.5 accent-primary"
                                checked={entry.canWrite}
                                onChange={(e) => field.onChange(field.value.map((m) => (m.moduleKey === key ? { ...m, canWrite: e.target.checked } : m)))}
                              />
                              {t("users.canWrite")}
                            </label>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {formState.errors.modules && (
                    <p role="alert" className="mt-1 text-xs text-danger">
                      {formState.errors.modules.message}
                    </p>
                  )}
                </fieldset>
              )}
            />
          )}
        </div>
      </section>

      {formError && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/admin/users" className="text-sm font-semibold text-muted hover:text-ink">
          {tc("cancel")}
        </Link>
        <Button type="submit" loading={formState.isSubmitting}>
          {t("users.create")}
        </Button>
      </div>

      <Dialog
        open={!!result}
        onClose={finish}
        title={t("users.createdOk")}
        closeLabel={tc("close")}
        size="sm"
        footer={<Button onClick={finish}>{tc("confirm")}</Button>}
      >
        {result?.temporaryPassword ? (
          <div>
            <p className="text-sm font-semibold text-ink">{t("users.tempPasswordTitle")}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 rounded-input border border-line bg-surface-table px-3 py-2 font-mono text-sm break-all">{result.temporaryPassword}</code>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.temporaryPassword ?? "");
                  setCopied(true);
                }}
              >
                <Copy className="size-4" aria-hidden /> {copied ? tc("saved") : "Copy"}
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">{t("users.tempPasswordHint")}</p>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("users.createdOk")}</p>
        )}
      </Dialog>
    </form>
  );
}
