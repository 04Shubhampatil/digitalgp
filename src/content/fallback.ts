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
  banner: 0,
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
  if (sectionKey === "welcome-video" || sectionKey === "home-gallery") {
    // Empty fields (and an empty photo list) keep the design content.
    return { ...fallback, ...filled(data) };
  }
  if (sectionKey === "whats-new") {
    // Rows typed in the editor are shown as they are; with no rows the block keeps listing the announcements.
    return has(data.items) ? { heading: fallback.heading, viewAll: fallback.viewAll, ...filled(data) } : { ...fallback, ...filled(data) };
  }
  if (sectionKey === "about-cards") {
    // Published cards and pictures on top of the design block: what the editor left empty keeps the design value.
    return { ...fallback, ...filled(data) };
  }
  if (sectionKey === "weather") {
    // Live weather: the card draws the provider's figures. The published section only names the place; the design card
    // (with its sample figures) stays for when the provider is not available. Old manual figures still win if present.
    if (has(data.current)) return data;
    const shown = typeof data.location === "string" && data.location.trim() ? { en: data.location, mr: data.location } : fallback.location;
    return { ...fallback, location: shown };
  }
  if (sectionKey === "weather-update") {
    // Same on the Environment page: without typed figures the design's sample figures stay until the provider answers.
    return { ...data, current: data.current ?? fallback.current, forecast: data.forecast ?? fallback.forecast };
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

/** Design pictogram for a published emergency row: the title names the special tiles (toll-free line, state centre). */
function emergencyIcon(i: Obj): string {
  const title = labelOf(i.title);
  if (/toll/.test(title)) return "tollfree";
  if (/state emergency|operations cent/.test(title)) return "state";
  if (/women|महिला/.test(title)) return "women";
  return EMERGENCY_ICON[String(i.icon)] ?? EMERGENCY_CATEGORY[String(i.category)] ?? "total";
}

function mergeAbout(fallback: FallbackSection, legacy: Map<string, Obj>): Obj {
  const d = fallback.data;
  switch (fallback.sectionKey) {
    case "about-hero": {
      const o = legacy.get("overview");
      if (!o) return d;
      const actions = ((o.actions as Obj[] | undefined) ?? []).filter((a) => a.href).map((a) => ({ ...a, href: aboutHref(a.href) }));
      return { ...d, ...filled({ eyebrow: o.eyebrow, title: o.heading, body: o.body, imageId: o.imageId }), ...(actions.length ? { actions } : {}) };
    }
    case "about-history": {
      const h = legacy.get("history") ?? {};
      const office = legacy.get("office") ?? {};
      // The two info cards under the text show the published office hours and contact details.
      const designCards = (d.cards as Obj[] | undefined) ?? [];
      const contact = [office.phone ? `Phone number: ${String(office.phone)}` : "", office.email ? `Email id: ${String(office.email)}` : ""].filter(Boolean).join("\n");
      const cards = designCards.map((c, i) => (i === 0 && has(office.hours) ? { ...c, body: office.hours } : i === 1 && contact ? { ...c, body: { en: contact } } : c));
      return {
        ...d,
        cards,
        ...filled({ heading: h.heading, body: h.body, mainImageId: h.mainImageId, secondImageId: h.secondImageId, mapImageId: h.mapImageId, mapUrl: office.mapUrl, address: office.address }),
      };
    }
    case "about-structure": {
      const office = legacy.get("office") ?? {};
      const membersSection = legacy.get("members") ?? {};
      const people = ((membersSection.items as Obj[] | undefined) ?? []) as { name?: Obj; designation?: Obj; photoId?: string }[];
      const members = ((d.members as Obj[] | undefined) ?? []).map((m) => {
        const hit = people.find((p) => labelOf(p.designation) === labelOf(m.role));
        return hit?.name ? { ...m, title: hit.name, ...(hit.photoId ? { photoId: hit.photoId } : {}) } : m;
      });
      // Published members whose designation has no card in the design get a card of their own.
      const extra = people.filter((p) => p.name && !members.some((m) => labelOf(m.role) === labelOf(p.designation))).map((p) => ({ role: p.designation, title: p.name, ...(p.photoId ? { photoId: p.photoId } : {}) }));
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
        ...filled({ vision: vision.title, visionBody: vision.body, missionLabel: mission.title, mission: mission.body, missionPoints: mission.points, valuesLabel: v.valuesTitle, values: v.values, imageId: v.imageId }),
      };
    }
    case "about-roles": {
      const r = legacy.get("roles-cards");
      const items = ((r?.items as Obj[] | undefined) ?? []).map((i) => ({ title: i.title, icon: i.icon, points: i.responsibilities }));
      return r && items.length ? { ...d, ...filled({ heading: r.heading }), items } : d;
    }
    case "about-emergency": {
      const e = legacy.get("emergency-services");
      const rows = ((e?.items as Obj[] | undefined) ?? [])
        .filter((i) => i.active !== false && i.number)
        .map((i) => ({ label: i.title, numbers: [String(i.number)], icon: emergencyIcon(i) }));
      // The design shows one "Women's Aid" tile with both women's helplines (1091 and 181).
      const items: typeof rows = [];
      for (const r of rows) {
        const same = r.icon === "women" ? items.find((x) => x.icon === "women") : undefined;
        if (same) same.numbers.push(...r.numbers);
        else items.push(r);
      }
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

/**
 * Registered section → the design block(s) it takes the place of once it is published (or switched off). Sections
 * whose design block has the same key need no entry.
 */
const REPLACES: Partial<Record<PageKey, Record<string, string[]>>> = {
  projects: {
    "top-stats": ["quick-stats"],
    "village-resolution-tracker": ["progress-tracker"],
    "impact-dashboard": ["impact-grid"],
    "success-stories": ["stories-figma"],
    "development-suggestions": ["cta-banner"],
    "before-after-gallery": ["before-after"],
  },
  schemes: { statistics: ["live-stats"], "quick-actions": ["service-strip"] },
  services: { "service-links": ["rts-grid"], "service-categories": ["action-cards"], "top-stats": ["live-stats"], help: ["help-card"] },
  announcements: {
    "announcement-categories": ["announce-categories"],
    "live-announcements": ["announce-feed"],
    calendar: ["announce-feed"],
    "deadline-cards": ["deadlines-downloads"],
    "download-forms": ["deadlines-downloads"],
    "support-cards": ["service-strip"],
  },
  contact: { "contact-cards": ["contact-cards-figma"] },
  grievance: { "complaint-form": ["grievance-register"], "track-complaint": ["grievance-track"] },
  infrastructure: { "top-stats": ["facility-grid"] },
};

/** Where a section of the editor shows on the public page (its own block, or the design block it is drawn in). */
export function publicAnchor(pageKey: PageKey, sectionKey: string, published = true): string {
  // The banner is the page's hero: its own block once published, the design's hero until then (first one found is framed).
  if (sectionKey === "banner") return "banner,hero,page-hero,about-hero";
  const designBlock = REPLACES[pageKey]?.[sectionKey]?.[0];
  if ((pageKey === "infrastructure" || pageKey === "projects") && sectionKey === "top-stats") return designBlock!;
  // Until the section is published the website still shows the design block it will replace.
  return !published && designBlock ? designBlock : sectionKey;
}

type Published = PublicPageDto["sections"][number];

/** Published "top-stats" of Infrastructure and Key Projects in the shape of the design block of that page. */
function adaptToDesign(pageKey: PageKey, s: Published, design: FallbackSection[]): Published | null {
  if (s.sectionKey !== "top-stats" || (pageKey !== "infrastructure" && pageKey !== "projects")) return null;
  const target = REPLACES[pageKey]!["top-stats"]![0]!;
  const base = design.find((x) => x.sectionKey === target);
  if (!base) return null;
  const rows = ((s.data.items as Obj[] | undefined) ?? []).filter((i) => i.visible !== false);
  if (rows.length === 0) return null;
  const withUnit = (i: Obj): Obj => {
    const unit = (i.unit ?? {}) as { en?: string; mr?: string };
    const v = String(i.value ?? "");
    return { en: [v, unit.en].filter(Boolean).join(" "), mr: [v, unit.mr || unit.en].filter(Boolean).join(" ") };
  };
  const items = pageKey === "infrastructure" ? rows.map((i) => ({ label: i.title, value: withUnit(i) })) : rows.map((i) => ({ label: i.title, value: i.value, unit: i.unit, icon: i.icon }));
  return { ...s, sectionKey: target, sortOrder: base.sortOrder, data: { ...base.data, ...filled({ heading: s.data.heading }), items } };
}

const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
/** Fields that hold a picture, file or link of an item (imageId, logoIds, iconUrl, iconImage, …). */
const MEDIA_KEY = /(Ids?|Url|iconImage)$/;
const itemName = (v: unknown): string => (isObj(v) ? labelOf(v.title ?? v.name ?? v.label ?? v.heading ?? v.skillName ?? v.question) : "");

/**
 * The pictures of the design are files of the website, not uploads, so the editor cannot store them. A published
 * section therefore keeps the design picture wherever its own is empty: for the section itself, and for a list item
 * whose title is still the one of the design (a retitled or new item never gets the picture of another item).
 */
function fillDesignMedia(data: unknown, design: unknown): unknown {
  if (Array.isArray(data) && Array.isArray(design)) {
    const byName = new Map<string, unknown>();
    for (const d of design) if (itemName(d)) byName.set(itemName(d), d);
    return data.map((item) => (itemName(item) && byName.has(itemName(item)) ? fillDesignMedia(item, byName.get(itemName(item))) : item));
  }
  if (isObj(data) && isObj(design)) {
    const out: Obj = { ...data };
    for (const [k, v] of Object.entries(design)) {
      if (MEDIA_KEY.test(k)) {
        if (!has(out[k])) out[k] = v;
      } else if (k in out && (isObj(v) || Array.isArray(v))) out[k] = fillDesignMedia(out[k], v);
    }
    return out;
  }
  return data;
}

/** Home sections that always sit on their design block, whatever else of the page is published. */
const DESIGN_BASE = new Set(["about-cards", "welcome-video", "home-gallery", "whats-new"]);

/**
 * The inner page hero of the design with what the Banner card holds written into it: eyebrow (supporting text), heading,
 * paragraph (description), buttons and picture. The design's own look (sizes, accent colour, picture position) stays. The
 * heading keeps the design's accent split while it is the text the card opened with; a new heading replaces it whole.
 */
function pageHeroFromBanner(design: Obj, b: Obj, ctas: Obj[]): Obj {
  const joined = (loc: "en" | "mr") => [(design.title as Obj | undefined)?.[loc], (design.titleAccent as Obj | undefined)?.[loc]].filter(Boolean).join(" ");
  const heading = (b.heading ?? {}) as Obj;
  const sameHeading = (["en", "mr"] as const).every((l) => !heading[l] || !joined(l) || String(heading[l]).trim() === joined(l).trim());
  const out: Obj = { ...design, designHero: "page-hero" };
  if (has(b.supportingText)) out.eyebrow = b.supportingText;
  if (has(b.description)) out.body = b.description;
  if (has(b.heading) && !sameHeading) {
    out.title = b.heading;
    for (const k of ["titleAccent", "titleParts", "accentBlock"]) delete out[k];
  }
  if (ctas.length) {
    out.actions = ctas;
    delete out.primary;
    delete out.secondary;
  }
  if (has(b.imageId)) out.imageId = b.imageId;
  return out;
}

/** Hero blocks a published, filled-in `banner` takes the place of. */
const HERO_KEYS = new Set(["hero", "page-hero", "about-hero"]);

function withSections(pageKey: PageKey, page: PublicPageDto | null, override: FallbackSection[] | null): PublicPageDto {
  const cms = hasPublishedCms(pageKey, page?.sections ?? []);
  // Section by section: a published section takes the place of its design block; every block nobody has published
  // yet keeps its design content, so editing one card never empties the rest of the page. In published mode the
  // blocks fed by records (projects, schemes, announcements) stop showing sample rows.
  const design = FALLBACK_SECTIONS[pageKey] ?? [];
  const liveKeys = new Set(LIVE_BLOCKS[pageKey] ?? []);
  const liveExtras = cms ? (LIVE_EXTRAS[pageKey] ?? []) : [];
  const fallbacks = (override ?? (cms ? [...design.filter((s) => !liveKeys.has(s.sectionKey)), ...liveExtras, ...liveBlocks(pageKey)] : design)).filter((s) => pageKey !== "home" || !HOME_HIDDEN.has(s.sectionKey));
  const welcomeData = pageKey === "home" ? (page?.sections.find((s) => s.sectionKey === "welcome")?.data as Obj | undefined) : undefined;
  const published = (page?.sections ?? [])
    .filter((s) => pageKey !== "home" || !HOME_HIDDEN.has(s.sectionKey))
    .map((s) => {
    // The home About block always sits on its design block, also when other sections of the page are published.
    const f = fallbacks.find((x) => x.sectionKey === s.sectionKey) ?? (DESIGN_BASE.has(s.sectionKey) ? (FALLBACK_SECTIONS[pageKey] ?? []).find((x) => x.sectionKey === s.sectionKey) : undefined);
    if (f && s.sectionKey === "about-cards" && welcomeData) {
      // One About block: the older "welcome" section's text and photo are the defaults under the About cards.
      const base = { ...f.data, ...filled({ subheading: welcomeData.body, mainImageId: welcomeData.imageId }) };
      return { ...s, data: fillLabels(s.sectionKey, s.data as Obj, base) };
    }
    return f ? { ...s, data: fillDesignMedia(fillLabels(s.sectionKey, s.data as Obj, f.data), f.data) as Obj } : s;
  });
  // The published About cards are the About block; the "welcome" section would draw the same block a second time.
  if (pageKey === "home" && welcomeData && published.some((s) => s.sectionKey === "about-cards")) {
    for (let i = published.length - 1; i >= 0; i--) if (published[i]!.sectionKey === "welcome") published.splice(i, 1);
  }
  // The Banner card of the editor is the page's hero. A filled-in banner replaces the hero (it is not added under
  // it); an empty one is skipped so the design's hero stays.
  const bannerAt = published.findIndex((s) => s.sectionKey === "banner");
  if (bannerAt >= 0) {
    const b = published[bannerAt]!.data as Obj;
    const filledBanner = has(b.heading) || has(b.imageId) || has(b.supportingText);
    const drop = filledBanner ? HERO_KEYS : new Set(["banner"]);
    if (filledBanner && !has(b.imageId)) {
      // No banner picture uploaded yet: keep the design's hero photo for the page.
      const designHero = (FALLBACK_SECTIONS[pageKey] ?? []).find((s) => HERO_KEYS.has(s.sectionKey))?.data;
      const fallbackImageUrl = (designHero?.imageUrl as string | undefined) ?? (pageKey === "home" ? "/images/figma/home-hero.png" : undefined);
      if (fallbackImageUrl) published[bannerAt] = { ...published[bannerAt]!, data: { ...b, fallbackImageUrl } };
    }
    // Home: the banner (image on the right, the layout the editor starts with) is drawn by the design's own hero, so the
    // page keeps the Figma look; its texts, buttons and picture come from the banner. Other layouts are the editor's choice.
    if (filledBanner && (b.layout ?? "image-right") === "image-right") {
      const designHero = design.find((s) => HERO_KEYS.has(s.sectionKey));
      const ctas = ((b.ctas as Obj[] | undefined) ?? []).filter((c) => c.href && has(c.label));
      if (pageKey === "home") {
        const designActions = (designHero?.data.actions as Obj[] | undefined) ?? [];
        published[bannerAt] = {
          ...published[bannerAt]!,
          data: { designHero: "hero", title: b.heading, subtitle: has(b.supportingText) ? b.supportingText : b.description, backgroundImageId: b.imageId, actions: ctas.length ? ctas : designActions },
        };
      } else if (designHero) {
        published[bannerAt] = { ...published[bannerAt]!, data: pageHeroFromBanner(designHero.data, b, ctas) };
      }
    }
    for (let i = published.length - 1; i >= 0; i--) if (drop.has(published[i]!.sectionKey)) published.splice(i, 1);
    if (filledBanner) for (let i = fallbacks.length - 1; i >= 0; i--) if (HERO_KEYS.has(fallbacks[i]!.sectionKey)) fallbacks.splice(i, 1);
  }
  // Schemes: the "Category strip" card edits the labels of the scheme levels strip (Central / State / District) and
  // can switch a level off; it is not drawn as a second row under it. Categories are matched to levels by their key.
  if (pageKey === "schemes") {
    const stripAt = published.findIndex((s) => s.sectionKey === "category-strip");
    const levelsAt = fallbacks.findIndex((s) => s.sectionKey === "scheme-levels");
    if (stripAt >= 0 && levelsAt >= 0) {
      const cats = ((published[stripAt]!.data as Obj).items as Obj[] | undefined) ?? [];
      const levels = fallbacks[levelsAt]!;
      const items = ((levels.data.items as Obj[] | undefined) ?? [])
        .map((it) => {
          const hit = cats.find((c) => String(c.key ?? "").trim().toUpperCase() === it.level);
          if (!hit) return it;
          return hit.active === false ? null : { ...it, label: has(hit.label) ? hit.label : it.label };
        })
        .filter((x): x is Obj => x !== null);
      fallbacks[levelsAt] = { ...levels, data: { ...levels.data, items } };
      published.splice(stripAt, 1);
    }
  }
  // Design blocks that are gone: replaced by a published section with another key, or switched off in the editor
  // ("Show this section" off hides the block, also while it still has its design content).
  const replaces = REPLACES[pageKey] ?? {};
  const hidden = new Set(page?.hiddenSections ?? []);
  const gone = new Set<string>(hidden);
  for (const key of [...published.map((s) => s.sectionKey), ...liveExtras.map((s) => s.sectionKey), ...hidden]) for (const k of replaces[key] ?? []) gone.add(k);
  // Stats typed in the editor are drawn in the design's own block of the page (facility tiles, stats strip).
  for (let i = 0; i < published.length; i++) {
    const adapted = adaptToDesign(pageKey, published[i]!, design);
    if (adapted) published[i] = adapted;
  }
  const have = new Set(published.map((s) => s.sectionKey));
  const extra = fallbacks
    .filter((s) => !have.has(s.sectionKey) && !gone.has(s.sectionKey) && !(s.skipIfPresent ?? []).some((k) => have.has(k)))
    .map((s) => ({ sectionKey: s.sectionKey, sortOrder: s.sortOrder, data: s.data, publishedAt: null }));
  // Inner pages follow the order of the design: a published section sits where its design block was.
  const designOrder = new Map(design.map((s) => [s.sectionKey, s.sortOrder]));
  const order = (s: { sectionKey: string; sortOrder: number }) =>
    pageKey === "home" ? (HOME_ORDER[s.sectionKey] ?? s.sortOrder) : override ? s.sortOrder : (designOrder.get(s.sectionKey) ?? designOrder.get((replaces[s.sectionKey] ?? [])[0] ?? "") ?? s.sortOrder);
  return {
    pageKey,
    seo: page?.seo ?? { titleEn: null, titleMr: null, descriptionEn: null, descriptionMr: null, shareImageId: null },
    sections: [...published, ...extra].map((s) => ({ ...s, sortOrder: order(s) })).sort((a, b) => a.sortOrder - b.sortOrder),
  };
}
