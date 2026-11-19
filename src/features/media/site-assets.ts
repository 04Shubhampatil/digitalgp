/**
 * Site assets: pictures that ship with the website itself (`public/images/...`, e.g. the design photos) registered
 * as media records, so sections reference them by a normal media id and an admin can replace them by uploading.
 *
 * Their `storageKey` is `site:<path>` and no bytes are stored: the media routes redirect to the static file, so
 * they survive redeploys on hosts without persistent disk (Vercel), and deleting the record never touches the file.
 */
export const SITE_ASSET_PREFIX = "site:";

/** Only plain paths under /images/ (no "..", no query, no scheme): the redirect can never leave the website. */
export const SITE_ASSET_PATH = /^\/images\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp|gif|svg|avif)$/;

/** Media sources an admin may reference from content (citizen complaint uploads never). */
export const LIBRARY_SOURCES = ["ADMIN", "SITE_ASSET"] as const;

export function isSiteAssetPath(path: string): boolean {
  return SITE_ASSET_PATH.test(path) && !path.includes("..");
}

export function siteAssetKey(path: string): string {
  if (!isSiteAssetPath(path)) throw new Error(`Not a site asset path: ${path}`);
  return `${SITE_ASSET_PREFIX}${path}`;
}

/** The site path for a site-asset storage key, or null for any other key. */
export function siteAssetPath(storageKey: string): string | null {
  if (!storageKey.startsWith(SITE_ASSET_PREFIX)) return null;
  const path = storageKey.slice(SITE_ASSET_PREFIX.length);
  return isSiteAssetPath(path) ? path : null;
}

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

export function siteAssetMime(path: string): string {
  return MIME[path.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";
}
