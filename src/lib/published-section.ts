import { db } from "@/lib/db";

/**
 * Published data of one page section, or null when the section is missing, hidden or never published.
 * Public features read settings only through this function, so drafts can never leak to the website.
 */
export async function publishedSectionData(tenantId: string, pageKey: string, sectionKey: string): Promise<Record<string, unknown> | null> {
  const section = await db.section.findFirst({
    where: { tenantId, sectionKey, page: { pageKey } },
    include: { published: true },
  });
  if (!section || !section.isVisible || !section.published) return null;
  return section.published.data as Record<string, unknown>;
}
