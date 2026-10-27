import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { AnnouncementForm } from "@/components/admin/announcements/AnnouncementForm";
import { PageHeader } from "@/components/ui/Card";
import { EDITABLE_STATUSES, announcements } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit announcement" };

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, cookie] = await Promise.all([params, getTranslations("admin"), cookieHeader()]);
  let item;
  try {
    item = await announcements.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  if (!EDITABLE_STATUSES.includes(item.status)) redirect(`/admin/announcements/${id}`);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("announcements.title")} description={item.titleEn ?? item.titleMr ?? ""} />
      <AnnouncementForm assignments={user.assignments} capabilities={user.capabilities} existing={item} />
    </div>
  );
}
