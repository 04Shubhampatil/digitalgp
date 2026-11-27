import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { SchemeForm } from "@/components/admin/schemes/SchemeForm";
import { PageHeader } from "@/components/ui/Card";
import { EDITABLE_STATUSES, schemes } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import type { UiLocale } from "@/i18n/config";
import { localName } from "@/i18n/text";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit scheme" };

export default async function EditSchemePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, locale, cookie] = await Promise.all([params, getTranslations("admin"), getLocale(), cookieHeader()]);
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
      <PageHeader title={t("schemes")} description={localName(item.nameEn, item.nameMr, locale as UiLocale)} />
      <SchemeForm assignments={user.assignments} capabilities={user.capabilities} existing={item} />
    </div>
  );
}
