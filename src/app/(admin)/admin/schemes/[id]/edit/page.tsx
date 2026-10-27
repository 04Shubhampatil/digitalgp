import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { SchemeForm } from "@/components/admin/schemes/SchemeForm";
import { PageHeader } from "@/components/ui/Card";
import { EDITABLE_STATUSES, schemes } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit scheme" };

export default async function EditSchemePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, cookie] = await Promise.all([params, getTranslations("admin"), cookieHeader()]);
  let item;
  try {
    item = await schemes.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  if (!EDITABLE_STATUSES.includes(item.status)) redirect(`/admin/schemes/${id}`);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("schemes")} description={item.nameEn ?? item.nameMr ?? ""} />
      <SchemeForm assignments={user.assignments} capabilities={user.capabilities} existing={item} />
    </div>
  );
}
