import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/users/CreateUserForm";
import { PageHeader } from "@/components/ui/Card";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Create user" };

export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "user:manage")) redirect("/admin/users");
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("users.create")} description={t("users.subtitle")} />
      <CreateUserForm assignments={user.assignments} />
    </div>
  );
}
