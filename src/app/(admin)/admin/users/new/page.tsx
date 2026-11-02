import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/users/CreateUserForm";
import { PageHeader } from "@/components/ui/Card";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Create block admin" };

/** Figma "Create Block Admin": the form beside a "What happens next?" list and a security note. */
export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "user:manage")) redirect("/admin/users");
  const t = await getTranslations("admin");
  const steps = [t("users.step1"), t("users.step2"), t("users.step3"), t("users.step4")];
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={t("users.createBlockAdmin")}
        description={t("users.createSubtitle")}
        actions={
          <Link href="/admin/users" className="inline-flex h-10 items-center rounded-button border border-line-strong bg-surface px-8 text-sm font-semibold text-ink hover:bg-surface-soft">
            {t("users.cancel")}
          </Link>
        }
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <CreateUserForm assignments={user.assignments} />
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
            <h2 className="text-[17px] font-bold text-ink">{t("users.securityNote")}</h2>
            <p className="mt-2 text-xs leading-5 text-muted">{t("users.securityText")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
