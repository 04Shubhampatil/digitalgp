import { publicMediaUrl } from "@/lib/api/public";

/**
 * Cards of the site draw their icon as a picture (the design's icon files). The editor stores an uploaded picture as
 * `iconImageId`; this turns it into the picture address the renderers already read (`iconImage` / `iconUrl`), so every
 * card shows an uploaded icon without each renderer knowing about uploads. A card with no upload is left as it is.
 */
export function withIconPictures<T>(data: T, slug: string): T {
  if (Array.isArray(data)) return data.map((x) => withIconPictures(x, slug)) as T;
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k] = typeof v === "object" && v !== null ? withIconPictures(v, slug) : v;
    if (typeof o.iconImageId === "string" && o.iconImageId) {
      const url = publicMediaUrl(slug, o.iconImageId);
      out.iconImage = url;
      out.iconUrl = url;
    }
    return out as T;
  }
  return data;
}
