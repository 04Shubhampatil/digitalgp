import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/admin/announcements/AnnouncementForm";
import { PageHeader } from "@/components/ui/Card";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "New announcement" };

export default async function NewAnnouncementPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "content:edit") && !hasCapability(user, "content:share")) redirect("/admin/announcements");
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("announcements.create")} />
      <AnnouncementForm assignments={user.assignments} capabilities={user.capabilities} />
    </div>
  );
}
