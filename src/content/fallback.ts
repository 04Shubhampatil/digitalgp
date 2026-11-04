import type { PageKey } from "@/config/pages";
import type { PublicPageDto } from "@/types/api";
import { FIGMA_ABOUT_SECTIONS } from "./figma-about";
import { FIGMA_HOME_SECTIONS } from "./figma-home";
import { FIGMA_PAGE_SECTIONS } from "./figma-pages";
import { FIGMA_PAGE_SECTIONS_B } from "./figma-pages-b";
import { FIGMA_PAGE_SECTIONS_C } from "./figma-pages-c";
import { PAGE_SECTIONS } from "@/config/sections-pages";
import { PROJECTS_SECTIONS, SCHEMES_SECTIONS } from "@/config/sections-extra";
import { FIGMA_PAGE_SECTIONS_D } from "./figma-pages-d";

/** A section as the public site receives it, before backend data exists. */
export interface FallbackSection {
  sectionKey: string;
  sortOrder: number;
  data: Record<string, unknown>;
  /** Skip this placeholder when the backend has published any of these section keys. */
  skipIfPresent?: string[];
}

/**
 * Figma placeholder sections per page. Published backend sections always take precedence; a
 * fallback is used only for a section key the backend has not published. Remove an entry to stop
 * showing its placeholder.
 */
export const FALLBACK_SECTIONS: Partial<Record<PageKey, FallbackSection[]>> = {
  home: FIGMA_HOME_SECTIONS,
  about: FIGMA_ABOUT_SECTIONS,
  ...FIGMA_PAGE_SECTIONS,
  ...FIGMA_PAGE_SECTIONS_B,
  ...FIGMA_PAGE_SECTIONS_C,
  ...FIGMA_PAGE_SECTIONS_D,
};

/**
 * Home page section order from the Figma design. Backend sort orders are overridden for these
 * keys so the page always follows the design (hero → stats → Citizen Services → About → indicators
 * → achievements → weather → welcome → leaders → notices).
 */
const HOME_ORDER: Record<string, number> = {
  hero: 0,
  "quick-stats": 10,
  "quick-links": 15,
  welcome: 20,
  "about-cards": 20,
  "monthly-metrics": 22,
  "ward-details": 23,
  achievements: 28,
  "whats-new": 29,
  weather: 30,
  "sarpanch-message": 31,
  "welcome-video": 34,
  "village-progress": 35,
  leaders: 45,
  notices: 50,
  "home-gallery": 55,
};

/** Published sections the Figma home does not show (Our Leaders lives on the About page). */
const HOME_HIDDEN = new Set(["leaders"]);

/**
 * Merge published backend sections with Figma placeholders for the same page.
 * Returns a page-shaped object so the existing renderers need no change.
 */
type Obj = Record<string, unknown>;
const labelOf = (v: unknown): string => {
  const o = v as { en?: string } | undefined;
  return (o?.en ?? "").trim().toLowerCase();
};

/**
 * Fill presentation-only labels (captions, link labels) that a published section left out, using the
 * Figma placeholder for the same section. Values and data rows are never copied: only text that
 * describes a row the backend already has (matched by its English label), or a missing section link.
 */
function fillLabels(sectionKey: string, data: Obj, fallback: Obj): Obj {
  if (sectionKey === "monthly-metrics") {
    const items = (data.items as Obj[] | undefined) ?? [];
    const base = new Map(((fallback.items as Obj[] | undefined) ?? []).map((i) => [labelOf(i.label), i]));
    return {
      ...data,
      period: data.period ?? fallback.period,
      items: items.map((i) => {
        const match = base.get(labelOf(i.label));
        return match?.caption && !i.caption ? { ...i, caption: match.caption } : i;
      }),
    };
  }
  if (sectionKey === "ward-details") return { ...data, viewAll: data.viewAll ?? fallback.viewAll };
  if (sectionKey === "village-progress") {
    // An indicator the editor listed without a value shows the design's value for that label until one is entered.
    const base = new Map(((fallback.items as Obj[] | undefined) ?? []).map((i) => [labelOf(i.label), i]));
    const items = ((data.items as Obj[] | undefined) ?? []).map((i) => (i.valueText ? i : { ...i, valueText: base.get(labelOf(i.label))?.valueText }));
    return { ...data, items };
  }
  return data;
}

/**
 * Blocks added in "published content" mode: real data that is not an editable section (e.g. the
 * announcements module's live list). They carry no placeholder values.
 */
const LIVE_EXTRAS: Partial<Record<PageKey, FallbackSection[]>> = {
  announcements: [{ sectionKey: "live-announcements", sortOrder: 15, data: {} }],
};

/**
 * Blocks that show real records from other modules (projects, schemes) and stay visible in published mode.
 * Only their headings and labels come from the placeholder; the sample rows are dropped.
 */
const LIVE_BLOCKS: Partial<Record<PageKey, string[]>> = {
  // "before-after" (source: projects) shows published projects that have before / after pictures.
  projects: ["project-showcase", "before-after"],
  schemes: ["scheme-levels", "scheme-showcase"],
};

function liveBlocks(pageKey: PageKey): FallbackSection[] {
  const keep = LIVE_BLOCKS[pageKey] ?? [];
  return (FALLBACK_SECTIONS[pageKey] ?? [])
    .filter((x) => keep.includes(x.sectionKey))
    .map((x) => {
      const items = (x.data.items as Obj[] | undefined) ?? [];
      return { ...x, data: { ...x.data, items: x.sectionKey === "scheme-levels" ? items.map((i) => ({ ...i, count: 0 })) : [] } };
    });
}

/**
 * Pages whose sections are managed in the admin (sections-pages.ts). While nothing of the page is
 * published the Figma placeholder page is shown; as soon as one section is published the page shows
 * only published content (no placeholders mixed in), so a half-finished page never shows sample data.
 */
function hasPublishedCms(pageKey: PageKey, published: { sectionKey: string }[]): boolean {
  // Projects and Schemes are defined in sections-extra; every other page in sections-pages.
  const defs = pageKey === "projects" ? PROJECTS_SECTIONS : pageKey === "schemes" ? SCHEMES_SECTIONS : (PAGE_SECTIONS[pageKey] ?? []);
  const keys = new Set(defs.map((s) => s.key));
  return keys.size > 0 && published.some((s) => keys.has(s.sectionKey));
}

/**
 * About page: the backend publishes its own keys (overview, history, geography, members, office, vision-mission,
 * roles-cards, emergency-services), which have no Figma layout of their own. Their content is merged into the design's
 * About sections (about-hero, about-history, about-structure, about-vision, about-roles, about-emergency) instead of
 * rendering beside them, so each block shows once, in the design layout, with the published data.
 */
const ABOUT_LEGACY = new Set(["overview", "history", "geography", "members", "office", "vision-mission", "roles-cards", "emergency-services"]);

/** Backend section key → the design section that shows it (anchors such as "page:about#members" follow the move). */
const ABOUT_ANCHORS: Record<string, string> = {
  overview: "about-hero",
  history: "about-history",
  // The hero's "Know Our Leaders" button points at #members; the leaders block is the design's answer to it.
  members: "leaders",
  office: "about-structure",
  "vision-mission": "about-vision",
  "roles-cards": "about-roles",
  "emergency-services": "about-emergency",
};
function aboutHref(href: unknown): unknown {
  if (typeof href !== "string") return href;
  const m = /^(page:about#)(.+)$/.exec(href);
  return m && ABOUT_ANCHORS[m[2]!] ? `${m[1]}${ABOUT_ANCHORS[m[2]!]}` : href;
}

const has = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.values(v as Obj).some((x) => typeof x === "string" && x.trim() !== "");
  return true;
};
/** Keep only the fields the backend actually filled (so the design's text stays where the backend has none). */
const filled = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => has(v)));

/** Backend emergency icon / category → the design's emergency pictogram. */
const EMERGENCY_ICON: Record<string, string> = { siren: "total", ambulance: "ambulance", flame: "fire", fire: "fire", health: "health", alert: "disaster", bolt: "electricity", tree: "forest", shield: "women" };
const EMERGENCY_CATEGORY: Record<string, string> = { health: "health", police: "women", fire: "fire", disaster: "disaster", utility: "electricity", other: "total" };

function mergeAbout(fallback: FallbackSection, legacy: Map<string, Obj>): Obj {
  const d = fallback.data;
  switch (fallback.sectionKey) {
    case "about-hero": {
      const o = legacy.get("overview");
      if (!o) return d;
      const actions = ((o.actions as Obj[] | undefined) ?? []).filter((a) => a.href).map((a) => ({ ...a, href: aboutHref(a.href) }));
      return { ...d, ...filled({ eyebrow: o.eyebrow, title: o.heading, body: o.body }), ...(actions.length ? { actions } : {}) };
    }
    case "about-history": {
      const h = legacy.get("history");
      return h?.body ? { ...d, body: h.body } : d;
    }
    case "about-structure": {
      const office = legacy.get("office") ?? {};
      const membersSection = legacy.get("members") ?? {};
      const people = ((membersSection.items as Obj[] | undefined) ?? []) as { name?: Obj; designation?: Obj }[];
      const members = ((d.members as Obj[] | undefined) ?? []).map((m) => {
        const hit = people.find((p) => labelOf(p.designation) === labelOf(m.role));
        return hit?.name ? { ...m, title: hit.name } : m;
      });
      // Published members whose designation has no card in the design get a card of their own.
      const extra = people.filter((p) => p.name && !members.some((m) => labelOf(m.role) === labelOf(p.designation))).map((p) => ({ role: p.designation, title: p.name }));
      const base = (d.office as Obj | undefined) ?? {};
      const keep = (k: string) => (office[k] ? { [k]: office[k] } : {});
      return { ...d, ...filled({ heading: membersSection.heading }), members: [...members, ...extra], office: { ...base, ...keep("address"), ...keep("hours"), ...keep("phone"), ...keep("email") } };
    }
    case "about-vision": {
      const v = legacy.get("vision-mission");
      if (!v) return d;
      const vision = (v.vision as Obj | undefined) ?? {};
      const mission = (v.mission as Obj | undefined) ?? {};
      return {
        ...d,
        ...filled({ vision: vision.title, visionBody: vision.body, missionLabel: mission.title, mission: mission.body, missionPoints: mission.points, valuesLabel: v.valuesTitle, values: v.values }),
      };
    }
    case "about-roles": {
      const r = legacy.get("roles-cards");
      const items = ((r?.items as Obj[] | undefined) ?? []).map((i) => ({ title: i.title, icon: i.icon, points: i.responsibilities }));
      return r && items.length ? { ...d, ...filled({ heading: r.heading }), items } : d;
    }
    case "about-emergency": {
      const e = legacy.get("emergency-services");
      const items = ((e?.items as Obj[] | undefined) ?? [])
        .filter((i) => i.active !== false && i.number)
        .map((i) => ({ label: i.title, numbers: [i.number], icon: EMERGENCY_ICON[String(i.icon)] ?? EMERGENCY_CATEGORY[String(i.category)] ?? "total" }));
      return e && items.length ? { ...d, ...filled({ heading: e.heading }), items } : d;
    }
    default:
      return d;
  }
}

export function withFallback(pageKey: PageKey, page: PublicPageDto | null): PublicPageDto {
  if (pageKey === "about" && page) {
    const legacy = new Map(page.sections.filter((s) => ABOUT_LEGACY.has(s.sectionKey)).map((s) => [s.sectionKey, s.data as Obj]));
    if (legacy.size > 0) {
      const rest = { ...page, sections: page.sections.filter((s) => !ABOUT_LEGACY.has(s.sectionKey)) };
      // skipIfPresent on the design blocks names the legacy keys merged here; other keys (e.g. leaders-profile-grid) still apply.
      const designed = (FALLBACK_SECTIONS.about ?? []).map((f) => ({ ...f, skipIfPresent: f.skipIfPresent?.filter((k) => !ABOUT_LEGACY.has(k)), data: mergeAbout(f, legacy) }));
      return withSections(pageKey, rest, designed);
    }
  }
  return withSections(pageKey, page, null);
}

function withSections(pageKey: PageKey, page: PublicPageDto | null, override: FallbackSection[] | null): PublicPageDto {
  const cms = hasPublishedCms(pageKey, page?.sections ?? []);
  const fallbacks = (override ?? (cms ? [...(LIVE_EXTRAS[pageKey] ?? []), ...liveBlocks(pageKey)] : (FALLBACK_SECTIONS[pageKey] ?? []))).filter((s) => pageKey !== "home" || !HOME_HIDDEN.has(s.sectionKey));
  const published = (page?.sections ?? [])
    .filter((s) => pageKey !== "home" || !HOME_HIDDEN.has(s.sectionKey))
    .map((s) => {
    const f = fallbacks.find((x) => x.sectionKey === s.sectionKey);
    return f ? { ...s, data: fillLabels(s.sectionKey, s.data as Obj, f.data) } : s;
  });
  const have = new Set(published.map((s) => s.sectionKey));
  const extra = fallbacks
    .filter((s) => !have.has(s.sectionKey) && !(s.skipIfPresent ?? []).some((k) => have.has(k)))
    .map((s) => ({ sectionKey: s.sectionKey, sortOrder: s.sortOrder, data: s.data, publishedAt: null }));
  const order = (s: { sectionKey: string; sortOrder: number }) => (pageKey === "home" ? (HOME_ORDER[s.sectionKey] ?? s.sortOrder) : s.sortOrder);
  return {
    pageKey,
    seo: page?.seo ?? { titleEn: null, titleMr: null, descriptionEn: null, descriptionMr: null, shareImageId: null },
    sections: [...published, ...extra].map((s) => ({ ...s, sortOrder: order(s) })).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
