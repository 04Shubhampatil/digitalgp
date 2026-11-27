"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { Role, TenantUserDto } from "@/types/api";
import { AccountFields } from "@/components/admin/websites/AccountFields";
import {
  accountShape,
  checkTypedPassword,
  emptyOperator,
  toAccountBody,
  translateServerMessage,
  type AccountMessages,
  type AccountValues,
  type OperatorValues,
} from "@/components/admin/websites/accountForm";
import { ModuleGrants } from "@/components/admin/websites/ModuleGrants";
import { TempPasswordList, type TempPasswordEntry } from "@/components/admin/websites/TempPasswordList";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import type { UiLocale } from "@/i18n/config";
import { users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

type FormValues = OperatorValues & { role: Role };
type FieldErrs = Partial<Record<keyof FormValues, { message?: string }>>;

/**
 * GP Admin and operators of one website, with status, "Add user" and "Reset password". The server decides who may do
 * what (scope + CREATABLE_ROLES); `addableRoles` and `canManage` only hide buttons the caller could not use anyway.
 */
export function WebsiteUsers({
  unitId,
  members,
  currentUserId,
  addableRoles,
}: {
  unitId: string;
  members: TenantUserDto[];
  currentUserId: string;
  /** Roles the caller may create here (empty hides "Add user" and "Reset password"). */
  addableRoles: Role[];
}) {
  const t = useTranslations("admin");
  const ts = useTranslations("admin.websiteSetup");
  const tc = useTranslations("common");
  const locale = useLocale() as UiLocale;
  const router = useRouter();
  const canManage = addableRoles.length > 0;

  const [addOpen, setAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwords, setPasswords] = useState<{ title: string; entries: TempPasswordEntry[] } | null>(null);
  const [resetTarget, setResetTarget] = useState<TenantUserDto | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const messages: AccountMessages = useMemo(
    () => ({ required: tc("required"), email: ts("errEmail"), phone: ts("errPhone"), password: ts("errPassword"), modules: ts("modulesRequired") }),
    [tc, ts],
  );
  const schema = useMemo(
    () =>
      z
        .object({
          ...accountShape(messages),
          role: z.enum(["GP_ADMIN", "DATA_ENTRY_OPERATOR"]),
          modules: z.array(z.object({ moduleKey: z.string(), canWrite: z.boolean() })),
        })
        .superRefine((v, ctx) => {
          checkTypedPassword(v, [], ctx, messages);
          if (v.role === "DATA_ENTRY_OPERATOR" && v.modules.length === 0) ctx.addIssue({ code: "custom", path: ["modules"], message: messages.modules });
        }),
    [messages],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) as never, defaultValues: { ...emptyOperator(), role: addableRoles[0] ?? "GP_ADMIN" } });
  const generate = useWatch({ control, name: "generate" });
  const role = useWatch({ control, name: "role" });

  function closeAdd() {
    setAddOpen(false);
    setFormError(null);
    reset();
  }

  async function onAdd(values: FormValues) {
    setFormError(null);
    try {
      const res = await users.create({
        ...toAccountBody(values),
        assignment: { role: values.role, unitId, ...(values.role === "DATA_ENTRY_OPERATOR" ? { modules: values.modules } : {}) },
      } as Parameters<typeof users.create>[0]);
      closeAdd();
      if (res.temporaryPassword) {
        setPasswords({ title: ts("userAdded"), entries: [{ label: `${res.user.name} · ${t(`role.${values.role}`)}`, email: res.user.email, password: res.temporaryPassword }] });
      }
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError((i.path.replace(/^assignment\./, "") || "email") as never, { message: translateServerMessage(i.message, ts, tc("errorGeneric")) });
        return;
      }
      if (isApiError(err, "CONFLICT")) return setFormError(translateServerMessage(err.message, ts, tc("errorGeneric")));
      if (isApiError(err, "FORBIDDEN")) return setFormError(ts("noPermission"));
      setFormError(tc("errorGeneric"));
    }
  }

  const doReset = () =>
    start(async () => {
      const target = resetTarget;
      if (!target) return;
      setResetError(null);
      try {
        const res = await users.resetPassword(target.id);
        setResetTarget(null);
        setPasswords({ title: ts("resetDoneFor", { name: target.name }), entries: [{ label: `${target.name} · ${t(`role.${target.role}`)}`, email: target.email, password: res.temporaryPassword }] });
        router.refresh();
      } catch (err) {
        setResetError(isApiError(err, "FORBIDDEN") ? ts("noPermission") : tc("errorGeneric"));
      }
    });

  const errs = errors as unknown as FieldErrs;

  return (
    <Card>
      <CardHeader
        title={ts("usersTitle")}
        description={ts("usersHint")}
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" aria-hidden /> {ts("addUser")}
            </Button>
          ) : undefined
        }
      />
      {members.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted">{ts("noUsers")}</p>
      ) : (
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-semibold tracking-wide text-muted uppercase">
                <th className="py-2 pr-4">{tc("name")}</th>
                <th className="py-2 pr-4">{t("users.roleField")}</th>
                <th className="py-2 pr-4">{tc("status")}</th>
                <th className="py-2 pr-4">{ts("lastSignIn")}</th>
                {canManage && <th className="py-2 text-right">{tc("actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-ink">{m.name}</p>
                    <p className="text-xs text-muted">{m.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-ink">
                    {t(`role.${m.role}`)}
                    {m.role === "DATA_ENTRY_OPERATOR" && m.modules.length > 0 && <p className="text-xs text-muted">{m.modules.map((x) => t(`moduleNames.${x.moduleKey}`)).join(", ")}</p>}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={m.status === "ACTIVE" ? "font-semibold text-success" : "font-semibold text-danger"}>{t(`users.userStatus.${m.status}`)}</span>
                    {m.mustResetPassword && <p className="text-xs text-warning">{ts("passwordChangePending")}</p>}
                  </td>
                  <td className="py-3 pr-4 text-muted">{m.lastLoginAt ? formatDate(m.lastLoginAt, locale) : ts("neverSignedIn")}</td>
                  {canManage && (
                    <td className="py-3 text-right">
                      {m.id !== currentUserId && (
                        <Button variant="secondary" size="sm" onClick={() => setResetTarget(m)}>
                          <KeyRound className="size-4" aria-hidden /> {t("usersUi.resetPassword")}
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={addOpen}
        onClose={closeAdd}
        size="lg"
        title={ts("addUserTitle")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={closeAdd}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="website-add-user-form" loading={isSubmitting}>
              {ts("addUserCreate")}
            </Button>
          </>
        }
      >
        <form id="website-add-user-form" onSubmit={handleSubmit(onAdd)} noValidate className="grid gap-4">
          <Select label={ts("roleField")} options={addableRoles.map((r) => ({ value: r, label: t(`role.${r}`) }))} {...register("role")} />
          <AccountFields reg={(f) => register(f as keyof FormValues & keyof AccountValues)} generate={generate} errors={errs} />
          {role === "DATA_ENTRY_OPERATOR" && (
            <Controller control={control} name="modules" render={({ field }) => <ModuleGrants value={field.value} onChange={field.onChange} error={errs.modules?.message} />} />
          )}
          {formError && (
            <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
              {formError}
            </p>
          )}
        </form>
      </Dialog>

      <Dialog
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        size="sm"
        title={t("usersUi.resetPassword")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              {tc("cancel")}
            </Button>
            <Button loading={pending} onClick={doReset}>
              {t("usersUi.resetPassword")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{t("usersUi.resetConfirm", { name: resetTarget?.name ?? "" })}</p>
        {resetError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {resetError}
          </p>
        )}
      </Dialog>

      <Dialog
        open={!!passwords}
        onClose={() => setPasswords(null)}
        size="md"
        title={passwords?.title ?? ""}
        closeLabel={tc("close")}
        footer={<Button onClick={() => setPasswords(null)}>{tc("confirm")}</Button>}
      >
        <p className="mb-4 text-sm text-muted">{t("users.tempPasswordHint")}</p>
        {passwords && <TempPasswordList entries={passwords.entries} />}
      </Dialog>
    </Card>
  );
}
