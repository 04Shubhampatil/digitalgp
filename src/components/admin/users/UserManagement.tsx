"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { AssignmentDto, ModuleKey, Role, UserDto } from "@/types/api";
import { MODULE_KEYS } from "@/config/modules";
import { UnitPicker } from "@/components/admin/UnitPicker";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { ROLE_LEVEL, ROLES } from "@/lib/roles";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(20),
  locale: z.enum(["MR", "EN", "HI"]),
});
type ProfileValues = z.infer<typeof profileSchema>;

/** Name, phone and language → PATCH /users/:id. */
function ProfileCard({ user, canEdit }: { user: UserDto; canEdit: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, phone: user.phone ?? "", locale: user.locale } });

  const onSubmit = (v: ProfileValues) =>
    start(async () => {
      setMessage(null);
      try {
        await users.update(user.id, { name: v.name, phone: v.phone || null, locale: v.locale });
        setMessage({ kind: "ok", text: tc("saved") });
        router.refresh();
      } catch (err) {
        setMessage({
          kind: "error",
          text: isApiError(err, "VALIDATION_ERROR") ? err.issues.map((i) => `${i.path}: ${i.message}`).join(" · ") : err instanceof Error ? err.message : tc("errorGeneric"),
        });
      }
    });

  return (
    <Card>
      <CardHeader title={t("usersUi.profile")} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 px-5 pb-5">
        <fieldset disabled={!canEdit || pending} className="grid gap-4">
          <Input label={tc("name")} error={errors.name?.message} {...register("name")} />
          <Input label={t("users.phone")} type="tel" error={errors.phone?.message} {...register("phone")} />
          <Select
            label={t("users.locale")}
            options={[
              { value: "MR", label: tc("marathi") },
              { value: "EN", label: tc("english") },
              { value: "HI", label: "हिंदी" },
            ]}
            {...register("locale")}
          />
        </fieldset>
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "text-sm text-danger" : "text-sm text-success"}>
            {message.text}
          </p>
        )}
        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              {tc("save")}
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

/** Add a role + scope (+ module grants for operators) → POST /users/:id/assignments. */
function AddAssignmentDialog({ userId, scope }: { userId: string; scope: AssignmentDto[] }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("GP_ADMIN");
  const [unitId, setUnitId] = useState("");
  const [modules, setModules] = useState<{ moduleKey: ModuleKey; canWrite: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isOperator = role === "DATA_ENTRY_OPERATOR";

  const close = () => {
    setOpen(false);
    setError(null);
    setUnitId("");
    setModules([]);
  };

  const save = () =>
    start(async () => {
      setError(null);
      if (!unitId) return setError(tc("required"));
      if (isOperator && modules.length === 0) return setError(t("usersUi.needModule"));
      try {
        await users.addAssignment(userId, { role, unitId, ...(isOperator ? { modules } : {}) } as Parameters<typeof users.addAssignment>[1]);
        close();
        router.refresh();
      } catch (err) {
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> {t("users.addAssignment")}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t("users.addAssignment")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {tc("cancel")}
            </Button>
            <Button loading={pending} onClick={save}>
              {tc("save")}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Select
            label={t("users.roleField")}
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
              setUnitId("");
            }}
            options={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))}
          />
          <div>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
              {t("users.scope")} · {t(`level.${ROLE_LEVEL[role]}`)}
            </p>
            <UnitPicker key={role} assignments={scope} targetLevel={ROLE_LEVEL[role]} allowIntermediate={role === "SUPER_ADMIN"} onChange={(u) => setUnitId(u?.id ?? "")} />
          </div>
          {isOperator && (
            <fieldset>
              <legend className="mb-2 text-[11px] font-semibold tracking-wide text-muted uppercase">{t("users.modules")}</legend>
              <ul className="grid gap-2 sm:grid-cols-2">
                {MODULE_KEYS.map((key) => {
                  const entry = modules.find((m) => m.moduleKey === key);
                  return (
                    <li key={key} className="flex items-center justify-between rounded-input border border-line px-3 py-2 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={!!entry}
                          onChange={(e) => setModules((m) => (e.target.checked ? [...m, { moduleKey: key, canWrite: true }] : m.filter((x) => x.moduleKey !== key)))}
                        />
                        {t(`moduleNames.${key}`)}
                      </label>
                      {entry && (
                        <label className="flex items-center gap-1.5 text-xs text-muted">
                          <input
                            type="checkbox"
                            className="size-3.5 accent-primary"
                            checked={entry.canWrite}
                            onChange={(e) => setModules((m) => m.map((x) => (x.moduleKey === key ? { ...x, canWrite: e.target.checked } : x)))}
                          />
                          {t("users.canWrite")}
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}

/** Profile edit, assignment list with revoke, and add-assignment. Server enforces every rule. */
export function UserManagement({ user, scope, canManage }: { user: UserDto; scope: AssignmentDto[]; canManage: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [toRevoke, setToRevoke] = useState<AssignmentDto | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const revoke = () =>
    start(async () => {
      if (!toRevoke) return;
      setError(null);
      try {
        await users.revokeAssignment(user.id, toRevoke.id);
        setToRevoke(null);
        router.refresh();
      } catch (err) {
        setToRevoke(null);
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ProfileCard user={user} canEdit={canManage} />
      <Card>
        <CardHeader title={t("users.assignments")} actions={canManage ? <AddAssignmentDialog userId={user.id} scope={scope} /> : null} />
        <ul className="divide-y divide-line px-5 pb-5">
          {user.assignments.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <p className={a.revokedAt ? "font-semibold text-muted line-through" : "font-semibold text-ink"}>
                  {t(`role.${a.role}`)}
                  {a.revokedAt && <span className="ml-2 text-xs font-normal text-danger">({t("users.revoked")})</span>}
                </p>
                <p className="text-xs text-muted">
                  {t(`level.${a.unitLevel}`)} · {a.unitNameEn}
                </p>
                {a.modules.length > 0 && (
                  <p className="mt-1 text-xs text-muted">{a.modules.map((m) => `${t(`moduleNames.${m.moduleKey}`)}${m.canWrite ? "" : ` (${tc("open")})`}`).join(", ")}</p>
                )}
              </div>
              {canManage && !a.revokedAt && (
                <button type="button" onClick={() => setToRevoke(a)} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-danger hover:underline">
                  <Trash2 className="size-3.5" aria-hidden /> {t("users.revoke")}
                </button>
              )}
            </li>
          ))}
          {user.assignments.length === 0 && <li className="py-3 text-sm text-muted">{t("usersUi.none")}</li>}
        </ul>
        {error && (
          <p role="alert" className="px-5 pb-4 text-sm text-danger">
            {error}
          </p>
        )}
      </Card>

      <Dialog
        open={!!toRevoke}
        onClose={() => setToRevoke(null)}
        title={t("users.revoke")}
        closeLabel={tc("close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToRevoke(null)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} onClick={revoke}>
              {t("users.revoke")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{t("usersUi.revokeConfirm", { role: toRevoke ? t(`role.${toRevoke.role}`) : "", unit: toRevoke?.unitNameEn ?? "" })}</p>
      </Dialog>
    </div>
  );
}
