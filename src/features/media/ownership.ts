import { db } from "@/lib/db";
import { Errors } from "@/lib/errors";

/**
 * A record may point at an admin-uploaded, non-deleted file that belongs to the same website, or
 * that is shared (no tenant) by the owner unit or one of its ancestors. Anything else is rejected
 * so a website can never reference another website's files.
 *
 * `tenantId` is the owning website (null for shared records); `unitPath` is the owner unit's path.
 */
export async function assertUsableMedia(
  mediaId: string,
  owner: { tenantId: string | null; unitPath: string },
  opts: { kind?: "IMAGE" | "DOCUMENT" | "VIDEO"; label?: string } = {},
): Promise<void> {
  const label = opts.label ?? "File";
  const media = await db.media.findFirst({
    where: { id: mediaId, deletedAt: null, source: "ADMIN", ...(opts.kind ? { kind: opts.kind } : {}) },
    select: { tenantId: true, ownerUnit: { select: { path: true } } },
  });
  if (!media) throw Errors.badRequest(`${label} not found`);
  const sameWebsite = owner.tenantId !== null && media.tenantId === owner.tenantId;
  const sharedFromAbove = media.tenantId === null && owner.unitPath.startsWith(media.ownerUnit.path);
  if (!sameWebsite && !sharedFromAbove) throw Errors.badRequest(`${label} belongs to another website`);
}
