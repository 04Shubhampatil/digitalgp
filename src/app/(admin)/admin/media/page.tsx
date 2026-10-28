import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { CursorPager } from "@/components/admin/CursorPager";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { PageHeader } from "@/components/ui/Card";
import { media } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { getCurrentUser, hasCapability } from "@/lib/session";

export const metadata: Metadata = { title: "Media" };
type Search = Promise<{ tenantId?: string; kind?: string; cursor?: string }>;

/** Media library (GET /media) with upload and delete — images, videos and PDFs per website. */
export default async function MediaPage({ searchParams }: { searchParams: Search }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [{ tenantId, kind, cursor }, t, tc, cookie] = await Promise.all([searchParams, getTranslations("admin"), getTranslations("common"), cookieHeader()]);
  const kindFilter = kind === "IMAGE" || kind === "VIDEO" || kind === "DOCUMENT" ? kind : undefined;
  const page = await media.list({ tenantId: tenantId || undefined, kind: kindFilter, cursor, limit: 40 }, { cookie });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={t("media")} description={t("mediaUi.subtitle")} />
      <MediaLibrary items={page.data} canManage={hasCapability(user, "media:manage")} initialTenantId={tenantId} />
      <div className="mt-2 rounded-card border border-line bg-surface">
        <CursorPager basePath="/admin/media" params={{ tenantId, kind: kindFilter, cursor }} nextCursor={page.page.nextCursor} shown={page.data.length} labels={{ showing: tc.raw("showing") as string, first: tc("firstPage"), next: tc("nextPage") }} />
      </div>
    </div>
  );
}
