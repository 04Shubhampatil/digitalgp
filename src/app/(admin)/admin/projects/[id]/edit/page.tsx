import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";
import { PageHeader } from "@/components/ui/Card";
import { EDITABLE_STATUSES, projects } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ id }, t, cookie] = await Promise.all([params, getTranslations("admin"), cookieHeader()]);
  let item;
  try {
    item = await projects.get(id, { cookie });
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }
  if (!EDITABLE_STATUSES.includes(item.status)) redirect(`/admin/projects/${id}`);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("projects")} description={item.nameEn ?? item.nameMr ?? ""} />
      <ProjectForm existing={item} />
    </div>
  );
}
