import { buildUrl } from "@/lib/api/client";

/**
 * True when a media id is the Figma design picture with this file name. Once the design content is published, its pictures
 * are shared media records, and the public media route redirects them to their design file; the redirect is followed
 * here (cached for an hour) so a block can tell the placeholder from a picture the Gram Panchayat uploaded.
 */
export async function isDesignPicture(slug: string, mediaId: string | undefined, fileName: string): Promise<boolean> {
  if (!mediaId) return false;
  if (mediaId.startsWith("/")) return mediaId.endsWith(`/${fileName}`);
  try {
    const res = await fetch(buildUrl(`/public/${encodeURIComponent(slug)}/media/${encodeURIComponent(mediaId)}`), { redirect: "manual", next: { revalidate: 3600 } });
    return (res.headers.get("location") ?? "").endsWith(`/${fileName}`);
  } catch {
    return false;
  }
}
