import type { PageKey } from "@/config/pages";
import { marathiFor } from "@/i18n/mr-fallback";

type Obj = Record<string, unknown>;

/** A section as the public page receives it (published data). */
export interface AdaptedSection {
  sectionKey: string;
  sortOrder: number;
  data: Obj;
  publishedAt: string | null;
}
/** A design block (its data is the presentation base: headings, labels, pictures and layout settings). */
export interface DesignBlock {
  sectionKey: string;
  sortOrder: number;
  data: Obj;
}

const has = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.values(v as Obj).some((x) => typeof x === "string" && x.trim() !== "");
  return true;
};
const filled = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => has(v)));
const rows = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const labelOf = (v: unknown): string => String((v as { en?: string } | undefined)?.en ?? "").trim().toLowerCase();
/** A plain string typed in the editor as the bilingual value the design blocks read. */
const both = (v: unknown): { en: string; mr: string } | undefined => (typeof v === "string" && v ? { en: v, mr: marathiFor(v) ?? v } : undefined);
/** "+911234567890" -> "+91 12345 67890" (how the design writes an Indian number); other numbers as they are. */
const spaced = (v: unknown): string | undefined => {
  const p = typeof v === "string" ? v : "";
  const m = /^\+91(\d{5})(\d{5})$/.exec(p);
  return m ? `+91 ${m[1]} ${m[2]}` : p || undefined;
};
/** "10:00" + "12:00" -> "10:00 AM - 12:00 PM" (the way the design writes event times). */
function clock(start: unknown, end: unknown): string | undefined {
  const f = (v: unknown) => {
    const m = /^(\d{2}):(\d{2})$/.exec(String(v ?? ""));
    if (!m) return undefined;
    const h = Number(m[1]);
    return `${String(h % 12 || 12).padStart(2, "0")}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
  };
  const a = f(start);
  const b = f(end);
  return a && b ? `${a} - ${b}` : (a ?? b);
}

/** Data key listing the fields of a shared design block that a section supplies (see mergeSameBlock). */
const OWN = "ownFields";

export interface AdaptContext {
  /** Sample rows of the design (placeholder content) may be shown: false when the design fallbacks are off. */
  samples: boolean;
}

/** Same item of the design block, matched by its English label: the design keeps its own picture for it. */
const designItem = (base: Obj, label: unknown, key = "items"): Obj | undefined => rows(base[key]).find((x) => labelOf(x.label ?? x.title ?? x.name) === labelOf(label) && labelOf(label) !== "");

type Adapter = (s: AdaptedSection, base: DesignBlock, ctx: AdaptContext) => Obj | null;

/**
 * Published section -> data of the design block that draws it, per page: `[section key, design block key, adapter]`.
 * The design block keeps the page's look (and what is computed from records: announcements, counts); what the editor
 * typed replaces the block's content. An adapter returns null to leave the section to its own renderer.
 */
const ADAPTERS: Partial<Record<PageKey, Record<string, { target: string; adapt: Adapter }>>> = {
  announcements: {
    // The tiles are the live announcement categories; the typed ones label the tiles while there are no announcements.
    "announcement-categories": {
      target: "announce-categories",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => has(i.label));
        return items.length ? { ...base.data, items: items.map((i) => ({ label: i.label })) } : null;
      },
    },
    // Latest announcements (live) beside the calendar: typed events show while no announcement has an event date.
    calendar: {
      target: "announce-feed",
      adapt: (s, base, ctx) => {
        const events = rows(s.data.events).map((e) => ({ date: e.date, title: e.title, time: clock(e.startTime, e.endTime), color: e.colour }));
        return { ...base.data, ...filled({ calendarTitle: s.data.title }), items: ctx.samples ? base.data.items : [], events: ctx.samples || events.length ? events : [] };
      },
    },
    "deadline-cards": {
      target: "deadlines-downloads",
      adapt: (s, base, ctx) => {
        const deadlines = rows(s.data.items).filter((i) => has(i.title)).map((i) => ({ date: both(i.date), title: i.title, caption: i.subtitle }));
        // Only the deadlines are this section's; the files belong to "download-forms" (see mergeSameBlock).
        return { ...base.data, deadlines, files: ctx.samples ? base.data.files : [], [OWN]: ["deadlines"] };
      },
    },
    "download-forms": {
      target: "deadlines-downloads",
      adapt: (s, base) => {
        // `caption` is the line under the name (e.g. "Government resolution (PDF)").
        const files = rows(s.data.items).filter((i) => has(i.name) && typeof i.fileId === "string").map((i) => ({ name: i.name, fileId: i.fileId, ...(has(i.description) ? { caption: i.description } : {}) }));
        return { ...base.data, deadlines: [], files, [OWN]: ["files"] };
      },
    },
    "support-cards": {
      target: "service-strip",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => i.visible !== false && has(i.title));
        if (!items.length) return null;
        return {
          ...base.data,
          ...filled({ heading: s.data.heading }),
          items: items.map((i) => {
            const same = designItem(base.data, i.title);
            return { label: i.title, caption: i.description, href: i.link, ...(has(i.iconImageId) ? { iconImageId: i.iconImageId } : same?.iconUrl ? { iconUrl: same.iconUrl } : {}) };
          }),
        };
      },
    },
  },
  services: {
    "service-links": {
      target: "rts-grid",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => i.visible !== false && has(i.title));
        return items.length ? { ...base.data, items: items.map((i) => ({ label: i.title, caption: i.description, href: i.href })) } : null;
      },
    },
    "service-categories": {
      target: "action-cards",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => has(i.title));
        return items.length ? { ...base.data, items: items.map((i) => ({ title: i.title, body: i.description, bullets: rows(i.features).length ? i.features : [], action: i.buttonText, href: i.buttonLink })) } : null;
      },
    },
    // The figures stay computed from records (each tile keeps its `live` key); the typed tiles give titles, pictures, colours.
    "top-stats": {
      target: "live-stats",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => i.visible !== false);
        if (!items.length) return null;
        const bases = rows(base.data.items);
        return {
          ...base.data,
          items: items.map((i, n) => {
            const same = bases.find((b) => labelOf(b.title) === labelOf(i.title)) ?? bases[n];
            return { live: same?.live, icon: i.icon ?? same?.icon, ...(has(i.iconImageId) ? { iconImageId: i.iconImageId } : same?.iconUrl ? { iconUrl: same.iconUrl } : {}), title: i.title, value: i.value, background: i.background ?? same?.background, visible: true };
          }),
        };
      },
    },
    help: {
      target: "help-card",
      adapt: (s, base) => {
        const c = rows(s.data.contact)[0] ?? {};
        const questions = rows(s.data.faqs).filter((f) => has(f.question)).map((f) => ({ label: f.question, href: "page:services#help-card" }));
        return {
          ...base.data,
          ...filled({ heading: s.data.heading, body: s.data.subtitle, phone: spaced(c.phone), phoneHours: both(c.hours), email: c.email }),
          ...(has(s.data.imageId) ? { imageId: s.data.imageId } : {}),
          ...(questions.length ? { queries: questions } : {}),
        };
      },
    },
  },
  schemes: {
    "quick-actions": {
      target: "service-strip",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => i.active !== false && has(i.title));
        if (!items.length) return null;
        return {
          ...base.data,
          items: items.map((i) => {
            const same = designItem(base.data, i.title);
            return { label: i.title, caption: i.description, href: i.buttonLink, ...(has(i.iconImageId) ? { iconImageId: i.iconImageId } : same?.iconUrl ? { iconUrl: same.iconUrl } : {}) };
          }),
        };
      },
    },
  },
  projects: {
    "before-after-gallery": {
      target: "before-after",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => has(i.beforeImageId) && has(i.afterImageId));
        if (!items.length) return null;
        return {
          ...base.data,
          ...filled({ eyebrow: s.data.eyebrow, heading: s.data.heading, viewAll: s.data.viewAll }),
          items: items.map((i) => ({ label: i.title, description: i.description, beforeImageId: i.beforeImageId, afterImageId: i.afterImageId, order: i.order })),
        };
      },
    },
    "development-suggestions": {
      target: "cta-banner",
      adapt: (s, base) => {
        const primary = has(s.data.buttonText) && typeof s.data.buttonLink === "string" ? { label: s.data.buttonText, href: s.data.buttonLink } : undefined;
        return { ...base.data, ...filled({ title: s.data.heading, body: s.data.description }), ...(primary ? { primary } : {}) };
      },
    },
  },
  about: {
    // The design's leaders block: its heading keeps the green accent while the typed heading is the design's own.
    "leaders-profile-grid": {
      target: "leaders",
      adapt: (s, base) => {
        const items = rows(s.data.items).filter((i) => has(i.name));
        if (!items.length) return null;
        const joined = (loc: "en" | "mr") => [(base.data.heading as Obj | undefined)?.[loc], (base.data.headingAccent as Obj | undefined)?.[loc]].filter(Boolean).join(" ");
        const typed = (s.data.heading ?? {}) as Obj;
        const same = (["en", "mr"] as const).every((l) => !typed[l] || !joined(l) || String(typed[l]).trim() === joined(l).trim());
        const own = has(s.data.heading) && !same ? { heading: s.data.heading, headingAccent: undefined } : {};
        return { ...base.data, ...own, items: items.map((i) => ({ photoId: i.photoId, name: i.name, designation: i.designation, organization: i.bio })) };
      },
    },
  },
  contact: {
    // Phone, email, address, hours and social links come from the website's settings; these cards give the labels.
    "contact-cards": {
      target: "contact-cards-figma",
      adapt: (s, base) => {
        const items = rows(s.data.items);
        if (!items.length) return null;
        const labels = { ...((base.data.labels as Obj | undefined) ?? {}) };
        // Cards are told apart by what they hold, not by their position (the order is the editor's choice): the one with
        // a phone number or an e-mail is "General inquiries", the one that names hours / times is "Office hours".
        const text = (i: Obj | undefined) => `${labelOf(i?.title)} ${String((i?.details as { en?: string } | undefined)?.en ?? "")}`.toLowerCase();
        const isReach = (i: Obj) => /@|\+?\d[\d\s-]{7,}\d/.test(text(i)) && !/\d{1,2}[:.]\d{2}/.test(text(i));
        const isHours = (i: Obj) => /hour|timing|\d{1,2}[:.]\d{2}\s*(am|pm)?|monday|mon\b/.test(text(i));
        const reach = items.find(isReach) ?? items[0];
        const hours = items.find((i) => i !== reach && isHours(i)) ?? items.find((i) => i !== reach);
        const address = items.find((i) => i !== reach && i !== hours);
        if (has(reach?.title)) labels.inquiries = reach!.title;
        if (has(hours?.title)) labels.hours = hours!.title;
        if (has(address?.title)) labels.address = address!.title;
        const lines = String((reach?.details as { en?: string } | undefined)?.en ?? "").split(/\n+/).map((x) => x.trim());
        const phone = lines.find((x) => /^\+?[\d\s-]{8,}$/.test(x));
        const email = lines.find((x) => /@/.test(x));
        return { ...base.data, labels, ...filled({ phone, email, hours: hours?.details, address: address?.details }) };
      },
    },
  },
  grievance: {
    "complaint-form": { target: "grievance-register", adapt: (s, base) => ({ ...base.data, ...filled({ heading: s.data.heading }) }) },
    "track-complaint": { target: "grievance-track", adapt: (s, base) => ({ ...base.data, ...filled({ heading: s.data.heading }) }) },
  },
};

/** Whether a published section of this page is drawn by a design block (the key of that block). */
export function adapterTarget(pageKey: PageKey, sectionKey: string): string | undefined {
  return ADAPTERS[pageKey]?.[sectionKey]?.target;
}

/** Published section as the design block that draws it, or null when the section keeps its own renderer. */
export function adaptWithDesign(pageKey: PageKey, s: AdaptedSection, design: DesignBlock[], ctx: AdaptContext): AdaptedSection | null {
  const a = ADAPTERS[pageKey]?.[s.sectionKey];
  if (!a) return null;
  const base = design.find((x) => x.sectionKey === a.target);
  if (!base) return null;
  const data = a.adapt(s, base, ctx);
  return data ? { ...s, sectionKey: a.target, sortOrder: base.sortOrder, data } : null;
}

/**
 * Two sections drawn by one block (deadlines + downloads): one block. A section that names the fields it owns (OWN)
 * always supplies those, whatever order the sections come in, so the deadlines never wipe the downloads (or the other
 * way round); otherwise the later section's filled fields fill the earlier one.
 */
export function mergeSameBlock<T extends { sectionKey: string; data: Obj }>(list: T[]): T[] {
  const out: T[] = [];
  for (const s of list) {
    const first = out.find((x) => x.sectionKey === s.sectionKey);
    if (!first) {
      out.push({ ...s, data: { ...s.data } });
      continue;
    }
    const mine = s.data[OWN] as string[] | undefined;
    const theirs = first.data[OWN] as string[] | undefined;
    if (mine && theirs) {
      first.data = { ...first.data, ...Object.fromEntries(mine.map((k) => [k, s.data[k]])), [OWN]: [...new Set([...theirs, ...mine])] };
    } else {
      first.data = { ...first.data, ...filled(s.data) };
    }
  }
  return out;
}
