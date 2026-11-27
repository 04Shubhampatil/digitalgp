import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Role } from "@/types/api";
import { PageHeader } from "@/components/ui/Card";
import { USER_TYPES, canCreateRole } from "@/lib/roles";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Create user" };

/**
 * The separate "Create User" section: one card per account type the signed-in admin may create, each opening its own
 * form (/admin/users/new/<type>). Super Admin sees Taluka Admin, Gram Panchayat Admin and Data Entry Operator;
 * a Taluka Admin sees the last two. POST /users re-checks everything on the server.
 */
export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "user:manage")) redirect("/admin/users");
  const t = await getTranslations("admin");
  const callerRoles = user.assignments.filter((a) => !a.revokedAt).map((a) => a.role);
  const types = (Object.entries(USER_TYPES) as [keyof typeof USER_TYPES, Role][]).filter(([, r]) => canCreateRole(callerRoles, r));
  if (types.length === 0) redirect("/admin/users");
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("usersUi.hubTitle")}
        description={t("usersUi.hubSubtitle")}
        actions={
          <Link href="/admin/users" className="inline-flex h-10 items-center rounded-button border border-line-strong bg-surface px-8 text-sm font-semibold text-ink hover:bg-surface-soft">
            {t("users.cancel")}
          </Link>
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {types.map(([slug]) => (
          <Link
            key={slug}
            href={`/admin/users/new/${slug}`}
            className="group flex flex-col rounded-card border border-line bg-surface p-5 transition-colors hover:border-primary hover:bg-surface-soft"
          >
            <h2 className="text-[17px] font-bold text-ink group-hover:text-primary">{t(`userTypes.${slug}.title`)}</h2>
            <p className="mt-1 text-sm text-muted">{t(`userTypes.${slug}.subtitle`)}</p>
            <p className="mt-3 flex-1 text-xs leading-5 text-muted">{t(`userTypes.${slug}.access`)}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {t("usersUi.hubOpen")}
              <ChevronRight className="size-4" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
