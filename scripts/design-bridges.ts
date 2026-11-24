/**
 * Conversions used by scripts/publish-design-content.ts for design blocks the editor seeds (src/lib/banner-seed.ts)
 * cannot turn into their section on their own: blocks drawn under another key (REPLACES in src/content/fallback.ts)
 * and blocks that miss a required setting. Each returns section data (unvalidated) or undefined.
 */
import type { PageKey } from "../src/config/pages";
import { FALLBACK_SECTIONS } from "../src/content/fallback";
import { marathiFor } from "../src/i18n/mr-fallback";

type Obj = Record<string, unknown>;
type Text = { en?: string; mr?: string };

const block = (page: PageKey, key: string) => (FALLBACK_SECTIONS[page] ?? []).find((s) => s.sectionKey === key)?.data as Obj | undefined;
const rows = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);

/** Bilingual text with Marathi filled from the design's translation table. */
function bi(v: unknown): Text | undefined {
  if (typeof v === "string") return v ? { en: v, mr: marathiFor(v) ?? "" } : undefined;
  if (!v || typeof v !== "object") return undefined;
  const { en, mr } = v as Text;
  if (!en && !mr) return undefined;
  return { en: en ?? "", mr: mr || (en ? (marathiFor(en) ?? "") : "") };
}
const plain = (v: unknown): string => (typeof v === "string" ? v : ((v as Text | undefined)?.en ?? ""));
const join = (a: unknown, b: unknown): Text | undefined => {
  const x = bi(a);
  const y = bi(b);
  if (!x || !y) return x ?? y;
  return { en: `${x.en} ${y.en}`.trim(), mr: `${x.mr} ${y.mr}`.trim() };
};
const link = (v: unknown) => {
  const o = (v ?? {}) as Obj;
  return bi(o.label) && typeof o.href === "string" ? { label: bi(o.label), href: o.href } : undefined;
};
const compact = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

const ICONS = ["award", "users", "building", "heart", "tree", "file", "road", "school"] as const;
const THEMES = ["green", "blue", "orange", "purple"] as const;

function emergencyCategory(label: string): string {
  const l = label.toLowerCase();
  if (/ambulance|health|hospital/.test(l)) return "health";
  if (/police|women/.test(l)) return "police";
  if (/fire/.test(l)) return "fire";
  if (/disaster|emergency operations/.test(l)) return "disaster";
  if (/electric|msedcl|water/.test(l)) return "utility";
  return "other";
}

export const DESIGN_BRIDGES: Partial<Record<PageKey, Record<string, () => Obj | undefined>>> = {
  about: {
    "leaders-profile-grid": () => {
      const d = block("about", "leaders");
      if (!d) return undefined;
      return compact({
        heading: join(d.heading, d.headingAccent),
        items: rows(d.items).map((i) => compact({ photoId: i.photoId, name: bi(i.name), designation: bi(i.designation) ?? bi(i.organization), bio: bi(i.organization) })),
      });
    },
    "roles-cards": () => {
      const d = block("about", "about-roles");
      if (!d) return undefined;
      return compact({ heading: bi(d.heading), items: rows(d.items).map((i, n) => ({ icon: ICONS[n % ICONS.length], title: bi(i.title), responsibilities: [bi(i.body)].filter(Boolean) })) });
    },
    "vision-mission": () => {
      const d = block("about", "about-vision");
      if (!d) return undefined;
      return compact({
        vision: compact({ title: bi(d.vision), body: bi(d.visionBody) ?? bi(d.vision) }),
        mission: compact({ title: bi(d.missionLabel), body: bi(d.mission) }),
        valuesTitle: bi(d.valuesLabel),
        values: rows(d.values).map((v) => bi(v)).filter(Boolean),
      });
    },
    "emergency-services": () => {
      const d = block("about", "about-emergency");
      if (!d) return undefined;
      const items = rows(d.items).flatMap((i) =>
        (Array.isArray(i.numbers) ? (i.numbers as unknown[]) : []).map((num) => ({
          title: bi(i.label),
          number: String(num).replace(/\s*-\s*/g, " ").trim(),
          category: emergencyCategory(plain(i.label)),
          icon: "phone",
          active: true,
        })),
      );
      return compact({ heading: bi(d.heading), items });
    },
  },
  projects: {
    "before-after-gallery": () => {
      const d = block("projects", "before-after");
      if (!d) return undefined;
      return compact({
        eyebrow: bi(d.eyebrow),
        viewAll: link(d.viewAll),
        items: rows(d.items)
          .filter((i) => i.beforeImageId && i.afterImageId)
          .map((i, n) => ({ beforeImageId: i.beforeImageId, afterImageId: i.afterImageId, title: bi(i.label), order: n + 1 })),
      });
    },
    "village-resolution-tracker": () => {
      const d = block("projects", "progress-tracker");
      if (!d) return undefined;
      return compact({
        heading: bi(d.title),
        items: rows(d.items).map((i) => {
          const pct = typeof i.percent === "number" ? Math.max(0, Math.min(100, i.percent)) : undefined;
          return compact({ title: bi(i.label), status: pct === undefined || pct === 0 ? "open" : pct >= 100 ? "resolved" : "in-progress", percent: pct });
        }),
      });
    },
    "impact-dashboard": () => {
      const d = block("projects", "impact-grid");
      if (!d) return undefined;
      return compact({ heading: bi(d.title), items: rows(d.items).map((i, n) => ({ icon: ICONS[n % ICONS.length], title: bi(i.label), value: String(i.value ?? ""), theme: THEMES[n % THEMES.length] })) });
    },
    "success-stories": () => {
      const d = block("projects", "stories-figma");
      if (!d) return undefined;
      return compact({
        heading: bi(d.title),
        viewAll: link(d.viewAll),
        layout: "quote",
        items: rows(d.items).map((i, n) => compact({ imageId: i.photoId, title: bi(i.name), personName: bi(i.name), description: bi(i.role), quote: bi(i.quote), order: n + 1 })),
      });
    },
    "development-suggestions": () => {
      const d = block("projects", "cta-banner");
      if (!d) return undefined;
      const primary = link(d.primary);
      return compact({ heading: bi(d.title), description: bi(d.body), buttonText: primary?.label, buttonLink: primary?.href });
    },
  },
  schemes: {
    "category-strip": () => {
      const d = block("schemes", "scheme-levels");
      if (!d) return undefined;
      return { items: rows(d.items).map((i) => compact({ icon: "building", iconImageId: i.iconImageId, label: bi(i.label), key: String(i.level ?? plain(i.label)).toLowerCase(), active: true })) };
    },
    "quick-actions": () => {
      const d = block("schemes", "service-strip");
      if (!d) return undefined;
      return {
        items: rows(d.items)
          .filter((i) => typeof i.href === "string")
          .map((i, n) => compact({ icon: ICONS[n % ICONS.length], iconImageId: i.iconImageId, title: bi(i.label), description: bi(i.caption), buttonText: bi(i.label), buttonLink: i.href, active: true })),
      };
    },
  },
};

/** The design's "Featured Schemes" cards as scheme records (published on the website, editable under Schemes). */
export function designSchemes(): {
  level: "CENTRAL" | "STATE" | "DISTRICT" | "GRAM_PANCHAYAT";
  name: Text;
  category?: string;
  description?: Text;
  benefitValue?: Text;
  benefitCaption?: Text;
}[] {
  const d = block("schemes", "scheme-showcase");
  const LEVELS: Record<string, "CENTRAL" | "STATE" | "DISTRICT"> = { central: "CENTRAL", state: "STATE", district: "DISTRICT" };
  return rows(d?.items)
    .filter((i) => bi(i.name))
    .map((i) => ({
      level: LEVELS[plain(i.level).toLowerCase()] ?? "GRAM_PANCHAYAT",
      name: bi(i.name)!,
      category: plain(i.category) || undefined,
      description: bi(i.description),
      benefitValue: bi(i.benefitValue),
      benefitCaption: bi(i.benefitCaption),
    }));
}

/** Required settings the design block leaves out, filled with the design's defaults. */
export function patchDesign(page: PageKey, key: string, data: Obj, ctx: { officeEmail?: string }): Obj | undefined {
  const fixDates = (list: unknown) => rows(list).map((i) => ({ ...i, date: plain(i.date) }));
  switch (`${page}/${key}`) {
    case "infrastructure/infra-map":
      return { zoom: 15, mapType: "roadmap", showZoomControls: true, showLegend: true, enableWardClick: false, showWardBoundary: false, fullscreenControl: true, height: 520, markers: [], ...data };
    case "infrastructure/latest-announcements":
    case "infrastructure/upcoming-events":
      return { enabled: true, ...data, items: fixDates(data.items) };
    case "employment/skill-directory":
      return { ...data, items: rows(data.items).map((i) => ({ countIsApproximate: false, ...i })) };
    case "education/student-spotlight":
      return { ...data, achievementCards: rows(data.achievementCards).map((c) => ({ ...c, value: plain(c.value) })) };
    case "grievance/complaint-form":
      return ctx.officeEmail ? { ...data, recipientEmail: ctx.officeEmail } : undefined;
    case "grievance/escalation-matrix":
      return { statusSummary: [], ...data };
    case "grievance/monthly-report":
      return {
        cardLabels: {
          total: { en: "Total Complaints", mr: "एकूण तक्रारी" },
          resolved: { en: "Resolved", mr: "निकाली" },
          pending: { en: "Pending", mr: "प्रलंबित" },
          resolutionRate: { en: "Resolution Rate", mr: "निवारण दर" },
        },
        categoryColours: [],
        ...data,
      };
    case "environment/market-prices": {
      const at = new Date(String(data.lastUpdatedAt ?? ""));
      return Number.isNaN(at.getTime()) ? undefined : { ...data, lastUpdatedAt: at.toISOString() };
    }
    case "gallery/then-and-now": {
      const heading = bi(data.heading) ?? { en: "Then & Now", mr: "तेव्हा आणि आता" };
      return { ...data, comparisons: rows(data.comparisons).map((c) => ({ ...c, heading: bi(c.heading) ?? heading })) };
    }
    default:
      return undefined;
  }
}
