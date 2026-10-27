import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { ProjectForm } from "@/components/admin/projects/ProjectForm";
import { PageHeader } from "@/components/ui/Card";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasCapability(user, "content:edit")) redirect("/admin/projects");
  const t = await getTranslations("admin");
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("projectsUi.create")} />
      <ProjectForm />
    </div>
  );
}
