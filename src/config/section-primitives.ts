import { z } from "zod";

/**
 * Shared building blocks for section schemas (src/config/sections.ts and sections-pages.ts).
 *
 * Conventions:
 *  - human text is bilingual `{ en?, mr? }`; plain labels that never need translation are strings;
 *  - media references are ids ending in `Id` / `Ids` (ownership is verified on write, see
 *    src/features/pages/service.ts); the `*Id` names are what `MEDIA_REF_PATTERN` matches;
 *  - external links are validated to the provider they are meant for (YouTube, Maps, …).
 */

export interface SectionDefinition {
  key: string;
  /** Zod schema for `SectionRevision.data`. Unknown keys are rejected. */
  schema: z.ZodType;
  /** Default ordering on first save. */
  sortOrder: number;
  /** Extra rule enforced only when a draft is submitted for review (e.g. guardian consent). */
  submitCheck?: (data: unknown) => void;
}

/** Keys of fields that reference Media ids, used for ownership verification on write. */
export const MEDIA_REF_PATTERN = /(image|photo|media|icon|logo|video|thumbnail|file|cover|attachment)Ids?$/i;

export const text = (max: number) => z.string().trim().max(max);
export const bilingualSchema = z.object({ en: text(200).optional(), mr: text(200).optional() }).strict();
export const bilingualLongSchema = z.object({ en: text(20_000).optional(), mr: text(20_000).optional() }).strict();
export const mediaId = z.string().trim().min(10).max(40).regex(/^[a-z0-9]+$/, "Invalid media id");
export const mediaIdList = (max: number) => z.array(mediaId).max(max);
export const href = z
  .string()
  .trim()
  .max(2000)
  .regex(/^(https?:\/\/|\/|mailto:|tel:)/, "Links must be absolute URLs, site-relative paths, mailto: or tel:");
export const phone = z.string().trim().regex(/^\+?[0-9]{10,15}$/, "Invalid phone number");
export const email = z.email().max(254);
export const colour = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour such as #1F7A4D");
export const amount = z.string().trim().regex(/^\d{1,12}(\.\d{1,2})?$/, "Use a plain number such as 12500.00");
export const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
export const isoDateTime = z.iso.datetime();
export const clockTime = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
export const percent = z.number().min(0).max(100);
export const order = z.number().int().min(0).max(10_000);
export const iconName = text(40);

/** Parse an absolute URL and require one of the given hostnames (with or without `www.`). */
export function hostAllowed(url: string, hosts: readonly string[], protocols: readonly string[] = ["https:"]): boolean {
  try {
    const u = new URL(url);
    if (!protocols.includes(u.protocol)) return false;
    const host = u.hostname.replace(/^www\./, "");
    return hosts.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** https-only link to any site. */
export const httpsUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => {
    try {
      return new URL(u).protocol === "https:";
    } catch {
      return false;
    }
  }, "Use an https:// address");

export const YOUTUBE_HOSTS = ["youtube.com", "youtu.be"] as const;
export const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com"] as const;
export const SOCIAL_REEL_HOSTS = ["youtube.com", "youtu.be", "instagram.com", "facebook.com", "fb.watch"] as const;

/** YouTube or Vimeo link (https), for embedded videos. */
export const videoUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => hostAllowed(u, VIDEO_HOSTS), "Use a YouTube or Vimeo https:// link");

/** Google Maps or OpenStreetMap embed URL only (rendered in a sandboxed iframe). */
export const mapEmbedUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (u) =>
      u.startsWith("https://www.google.com/maps/embed") ||
      u.startsWith("https://maps.google.com/maps") ||
      u.startsWith("https://www.openstreetmap.org/export/embed"),
    "Use a Google Maps or OpenStreetMap embed link",
  );

// ---------------------------------------------------------------------------
// GeoJSON geometry for ward maps (Polygon / MultiPolygon only, bounded size, WGS84 ranges)
// ---------------------------------------------------------------------------

/** Maximum coordinate pairs in one ward geometry; keeps section JSON and map rendering small. */
export const GEOMETRY_MAX_POSITIONS = 2000;

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
/** A ring: ≥ 4 positions, first equals last (closed). */
const ring = z
  .array(position)
  .min(4)
  .refine((r) => r[0]![0] === r[r.length - 1]![0] && r[0]![1] === r[r.length - 1]![1], "Each ring must be closed (first and last position equal)");
const polygonCoords = z.array(ring).min(1).max(20);
const countPositions = (coords: number[][][]) => coords.reduce((n, r) => n + r.length, 0);

export const geometrySchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("Polygon"), coordinates: polygonCoords }).strict(),
    z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(polygonCoords).min(1).max(50) }).strict(),
  ])
  .refine(
    (g) => (g.type === "Polygon" ? countPositions(g.coordinates) : g.coordinates.reduce((n, p) => n + countPositions(p), 0)) <= GEOMETRY_MAX_POSITIONS,
    `A ward geometry may hold at most ${GEOMETRY_MAX_POSITIONS} coordinate pairs`,
  );

/** Repeated list of bilingual items: `items: [{...}]` with a sane upper bound. */
export const itemList = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max);

/** Standard "Support cards" item: used by Grievance, Employment and Education pages. */
export const supportCardItem = z
  .object({
    icon: iconName,
    title: bilingualSchema,
    description: bilingualSchema.optional(),
    contactOrAction: text(300).optional(),
    visible: z.boolean(),
  })
  .strict();

/** Figma "Top Statistics" item (shared by most pages). */
export const topStatItem = z
  .object({
    icon: iconName,
    title: bilingualSchema,
    value: text(40),
    unit: bilingualSchema.optional(),
    description: bilingualSchema.optional(),
    background: colour.optional(),
    visible: z.boolean(),
  })
  .strict();

/** Figma "Banner" section, shared by every public page. */
export const bannerSchema = z
  .object({
    layout: z.enum(["full-background", "image-right", "image-left", "framed-image"]),
    heading: bilingualSchema.optional(),
    supportingText: bilingualSchema.optional(),
    description: bilingualLongSchema.optional(),
    ctas: z
      .array(
        z
          .object({
            label: bilingualSchema,
            linkType: z.enum(["page", "external"]),
            href,
            openInNewTab: z.boolean(),
          })
          .strict()
          .refine((cta) => cta.linkType !== "external" || /^https:\/\//.test(cta.href) || cta.href.startsWith("mailto:") || cta.href.startsWith("tel:"), {
            message: "External links must use https://",
            path: ["href"],
          }),
      )
      .max(2)
      .optional(),
    imageId: mediaId.optional(),
    textPosition: z
      .object({
        horizontal: z.enum(["left", "center", "right"]),
        vertical: z.enum(["top", "middle", "bottom"]),
      })
      .strict()
      .optional(),
    overlay: z
      .object({
        enabled: z.boolean(),
        colour,
        intensity: z.number().int().min(0).max(100),
        gradient: z.enum(["left-right", "right-left", "top-bottom", "none"]),
      })
      .strict()
      .optional(),
    appearance: z
      .object({
        height: z.number().int().min(100).max(1200),
        contentWidth: z.enum(["small", "medium", "large"]),
        cornerRadius: z.number().int().min(0).max(64),
        textColour: colour,
      })
      .strict()
      .optional(),
  })
  .strict();
