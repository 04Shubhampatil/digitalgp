import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Role } from "@/types/api";
import { CreateUserForm } from "@/components/admin/users/CreateUserForm";
import { PageHeader } from "@/components/ui/Card";
import { USER_TYPES, canCreateRole, type UserTypeSlug } from "@/lib/roles";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Create user" };

/**
 * The separate create forms: /admin/users/new/gp-admin, /taluka-admin, /data-operator. Each fixes the role and
 * shows the matching scope picker (Gram Panchayat or Taluka) and, for operators, the module grants.
 * The page is only offered to callers whose role may create that type; POST /users re-checks everything.
 */
export default async function NewUserByTypePage({ params }: { params: Promise<{ type: string }> }) {
  const [{ type }, user, t] = await Promise.all([params, getCurrentUser(), getTranslations("admin")]);
  if (!user) redirect("/login");
  if (!(type in USER_TYPES)) notFound();
  const role: Role = USER_TYPES[type as UserTypeSlug];
  const callerRoles = user.assignments.filter((a) => !a.revokedAt).map((a) => a.role);
  if (!hasCapability(user, "user:manage") || !canCreateRole(callerRoles, role)) redirect("/admin/users");

  const key = type as UserTypeSlug;
  const steps = [t("users.step1"), t(`userTypes.${key}.next`), t("users.step3"), t("users.step4")];
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t(`userTypes.${key}.title`)}
        description={t(`userTypes.${key}.subtitle`)}
        actions={
          <Link href="/admin/users?role=all" className="inline-flex h-10 items-center rounded-button border border-line-strong bg-surface px-8 text-sm font-semibold text-ink hover:bg-surface-soft">
            {t("users.cancel")}
          </Link>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <CreateUserForm key={role} assignments={user.assignments} fixedRole={role} />
        <div className="grid gap-5">
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-4 text-[17px] font-bold text-ink">{t("users.whatNext")}</h2>
            <ol className="grid gap-4">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm text-ink">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-bold text-primary">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-[17px] font-bold text-ink">{t("users.permissions")}</h2>
            <p className="mt-2 text-xs leading-5 text-muted">{t(`userTypes.${key}.access`)}</p>
          </section>
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="text-[17px] font-bold text-ink">{t("users.securityNote")}</h2>
            <p className="mt-2 text-xs leading-5 text-muted">{t("users.securityText")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
