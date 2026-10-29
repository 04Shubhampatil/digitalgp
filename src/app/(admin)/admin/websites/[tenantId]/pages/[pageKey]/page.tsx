import type { Metadata } from "next";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isPageKey } from "@/config/pages";
import { pageHref } from "@/config/public-nav";
import { SECTION_EDITORS, editorSpec } from "@/config/section-editors";
import { PageSettingsForm } from "@/components/admin/editor/PageSettingsForm";
import { SectionEditor } from "@/components/admin/editor/SectionEditor";
import { PageHeader } from "@/components/ui/Card";
import { content, tenants } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Page editor" };

/**
 * Per-page CMS editor (Figma "1. Home Admin" … "15. Contact"): one collapsible card per
 * registered section, each with its own draft / review / publish lifecycle.
 */
export default async function PageEditor({ params }: { params: Promise<{ tenantId: string; pageKey: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ tenantId, pageKey }, t, ta, cookie] = await Promise.all([params, getTranslations("editor"), getTranslations("admin"), cookieHeader()]);
  if (!isPageKey(pageKey)) notFound();

  let tenant;
  let page;
  try {
    [tenant, page] = await Promise.all([tenants.get(tenantId, { cookie }), content.getPage(tenantId, pageKey, { cookie })]);
  } catch (err) {
    if (isApiError(err, "NOT_FOUND")) notFound();
    throw err;
  }

  const specs = SECTION_EDITORS[pageKey] ?? [];
  const ordered = page.sections.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const unknown = ordered.filter((s) => !editorSpec(pageKey, s.sectionKey));

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={`/admin/websites/${tenantId}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> {tenant.nameEn}
      </Link>
      <PageHeader
        title={ta(`pageNames.${pageKey}`)}
        description={t("subtitle", { name: tenant.nameEn })}
        actions={
          tenant.status === "PUBLISHED" && page.isEnabled ? (
            <a href={pageHref(tenant.slug, pageKey)} target="_blank" rel="noopener" className="inline-flex h-9 items-center gap-1.5 rounded-button border border-line bg-surface px-3 text-sm font-semibold text-primary hover:bg-surface-soft">
              {ta("websites.viewSite")} <ExternalLink className="size-4" aria-hidden />
            </a>
          ) : null
        }
      />

      <div className="grid gap-4">
        {specs.length === 0 && <p className="rounded-card border border-line bg-surface p-5 text-sm text-muted">{t("noSections")}</p>}

        {ordered.map((section) => {
          const spec = editorSpec(pageKey, section.sectionKey);
          if (!spec) return null;
          return <SectionEditor key={section.sectionKey} tenantId={tenantId} pageKey={pageKey} spec={spec} section={section} capabilities={user.capabilities} defaultOpen />;
        })}

        {/* SEO / page-enabled settings sit below the sections (not part of the Figma section cards). */}
        <PageSettingsForm page={page} canUpdate={hasCapability(user, "tenant:update")} />

        {unknown.length > 0 && (
          <p className="text-xs text-muted">
            {t("unknownSections")}: {unknown.map((s) => s.sectionKey).join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
