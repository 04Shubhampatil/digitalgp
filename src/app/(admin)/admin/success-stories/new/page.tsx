import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SuccessStoryForm } from "@/components/admin/success-stories/SuccessStoryForm";
import { PageHeader } from "@/components/ui/Card";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "New success story" };

export default async function NewSuccessStoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "content:edit")) redirect("/admin/success-stories");
  const t = await getTranslations("admin");
  // Gram Panchayat staff with one website get it preselected.
  const active = user.assignments.filter((a) => !a.revokedAt);
  const soleTenant = active.length === 1 ? (active[0]?.tenantId ?? undefined) : undefined;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("storiesUi.create")} description={t("storiesUi.subtitle")} />
      <SuccessStoryForm defaultTenantId={soleTenant} />
    </div>
  );
}
