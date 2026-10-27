import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SchemeForm } from "@/components/admin/schemes/SchemeForm";
import { PageHeader } from "@/components/ui/Card";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "New scheme" };

export default async function NewSchemePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "content:edit") && !hasCapability(user, "content:share")) redirect("/admin/schemes");
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("schemesUi.create")} />
      <SchemeForm assignments={user.assignments} capabilities={user.capabilities} />
    </div>
  );
}
