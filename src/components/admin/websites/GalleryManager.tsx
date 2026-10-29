import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { CurrentUserDto } from "@/types/api";
import { MediaLibrary } from "@/components/admin/media/MediaLibrary";
import { Card, CardHeader } from "@/components/ui/Card";
import { media } from "@/lib/api/admin";
import { cookieHeader } from "@/lib/api/server";
import { hasCapability } from "@/lib/session";

const SHOWN = 40;

/**
 * "Media Library" card of the Gallery & Media editor (Figma): this website's uploaded photos, videos and
 * PDFs with upload and delete. Gallery categories, captions and ordering need backend sections
 * (docs/admin-editor-backend-needs.md); until then the public gallery shows its design content.
 */
export async function GalleryManager({ user, tenantId }: { user: CurrentUserDto; tenantId: string }) {
  const [t, cookie] = await Promise.all([getTranslations("admin"), cookieHeader()]);
  const page = await media.list({ tenantId, limit: SHOWN }, { cookie });
  return (
    <Card>
      <CardHeader title={t("mediaUi.websiteTitle")} description={t("mediaUi.websiteDesc")} />
      <div className="px-5 pb-5">
        <MediaLibrary items={page.data} canManage={hasCapability(user, "media:manage")} initialTenantId={tenantId} />
        {page.page.nextCursor && (
          <p className="mt-3 text-xs text-muted">
            {t("mediaUi.showingFirst", { n: page.data.length })}{" "}
            <Link href={`/admin/media?tenantId=${tenantId}`} className="font-semibold text-primary hover:underline">
              {t("mediaUi.viewAll")}
            </Link>
          </p>
        )}
      </div>
    </Card>
  );
}
