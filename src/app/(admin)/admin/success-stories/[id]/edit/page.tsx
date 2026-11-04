import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { SuccessStoryForm } from "@/components/admin/success-stories/SuccessStoryForm";
import { PageHeader } from "@/components/ui/Card";
import { EDITABLE_STATUSES, successStories } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit success story" };

export default async function EditSuccessStoryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, cookie] = await Promise.all([params, getTranslations("admin"), cookieHeader()]);
  let item;
  try {
    item = await successStories.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  if (!EDITABLE_STATUSES.includes(item.status)) redirect(`/admin/success-stories/${id}`);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("storiesUi.titlePlural")} description={item.titleEn ?? item.titleMr ?? ""} />
      <SuccessStoryForm existing={item} />
    </div>
  );
}
