import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";

/**
 * Refresh the public site's cached fetches after content changes. The frontend tags its public
 * reads with `tenant:<slug>` and `page:<slug>:<pageKey>` (src/lib/api/public.ts); the services
 * call this after a publish/unpublish or a settings change so pages update without waiting for
 * the 60 s time-based revalidation.
 *
 * Outside a Next request scope (tests, scripts) `revalidateTag` throws — that is harmless there,
 * so failures are swallowed.
 */
export function revalidatePublicTags(tags: string[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, "max");
    } catch {
      /* no request scope (tests / CLI) — nothing cached to refresh */
    }
  }
}

export const tenantTag = (slug: string) => `tenant:${slug}`;
export const pageTag = (slug: string, pageKey: string) => `page:${slug}:${pageKey}`;

/**
 * Revalidate every website under a unit path. Shared content (owned by a taluka or district) reaches
 * all websites below it, so each of them is refreshed. Call after publish, unpublish or archive.
 */
export async function revalidateWebsitesUnder(unitPath: string): Promise<void> {
  const tenants = await db.tenant.findMany({ where: { unit: { path: { startsWith: unitPath } } }, select: { slug: true } });
  revalidatePublicTags(tenants.map((t) => tenantTag(t.slug)));
}
