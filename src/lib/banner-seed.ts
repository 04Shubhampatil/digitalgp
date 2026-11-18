import type { PageKey } from "@/config/pages";
import { findSection } from "@/config/sections";
import { FALLBACK_SECTIONS } from "@/content/fallback";
import { marathiFor } from "@/i18n/mr-fallback";

type Obj = Record<string, unknown>;
const MEDIA_ID = /^[a-z0-9]{10,40}$/;
type Text = { en?: string; mr?: string };

/** Bilingual value with the Marathi text filled from the design's translation table when it is missing. */
function text(v: unknown): Text | undefined {
  if (!v || typeof v !== "object") return undefined;
  const { en, mr } = v as Text;
  if (!en && !mr) return undefined;
  return { en: en ?? "", mr: mr || (en ? (marathiFor(en) ?? "") : "") };
}

function join(a: Text | undefined, b: Text | undefined): Text | undefined {
  if (!a) return b;
  if (!b) return a;
  return { en: [a.en, b.en].filter(Boolean).join(" "), mr: [a.mr, b.mr].filter(Boolean).join(" ") };
}

function buttons(list: unknown): Obj[] {
  return (Array.isArray(list) ? (list as Obj[]) : [])
    .filter((c) => typeof c?.href === "string" && c.href && text(c.label))
    .slice(0, 3)
    .map((c) => {
      const href = c.href as string;
      const external = /^(https?:|mailto:|tel:)/.test(href);
      return { label: text(c.label), linkType: external ? "external" : "page", href, openInNewTab: external && href.startsWith("http") };
    });
}

/**
 * What a section card shows before it has been saved, for sections whose design content the website already shows
 * (the home About block, Welcome video, Gallery strip and What's New). Same rule as the banner: nothing is stored until the editor saves.
 */
export function sectionSeed(pageKey: PageKey, sectionKey: string, welcome?: Obj | null): Obj | undefined {
  if (pageKey === "projects" && sectionKey === "dev-timeline") {
    // The design's timeline, so the card can be saved as it is and then edited.
    const t = (FALLBACK_SECTIONS.projects ?? []).find((x) => x.sectionKey === "dev-timeline")?.data;
    if (!t) return undefined;
    const action = (t.action ?? {}) as Obj;
    return {
      title: text(t.title),
      steps: (Array.isArray(t.steps) ? (t.steps as Obj[]) : []).map((x) => ({ year: String(x.year ?? ""), label: text(x.label), status: text(x.status), done: x.done !== false })),
      ...(text(action.label) && typeof action.href === "string" ? { action: { label: text(action.label), href: action.href } } : {}),
    };
  }
  if (pageKey !== "home") return undefined;
  const d = (FALLBACK_SECTIONS.home ?? []).find((s) => s.sectionKey === sectionKey)?.data;
  if (!d) return undefined;
  // The design pictures of these blocks are site files, not uploads, so only their texts and links are prefilled.
  if (sectionKey === "welcome-video") return { heading: text(d.heading), watchLabel: text(d.watchLabel) };
  if (sectionKey === "home-gallery") return { heading: text(d.heading) };
  if (sectionKey === "whats-new") {
    const all = (d.viewAll ?? {}) as Obj;
    return { heading: text(d.heading), ...(text(all.label) && typeof all.href === "string" ? { viewAll: { label: text(all.label), href: all.href } } : {}) };
  }
  if (sectionKey !== "about-cards") return undefined;
  const icons = ["landmark", "factory", "leaf"];
  const readMore = (d.readMore ?? {}) as Obj;
  return {
    heading: text(d.heading),
    // The older "About the village" section (welcome) holds the intro text and photo of the same block.
    subheading: text(welcome?.body) ?? text(d.subheading),
    ...(typeof welcome?.imageId === "string" && welcome.imageId ? { mainImageId: welcome.imageId } : {}),
    address: text(d.address),
    buttonText: text(readMore.label),
    ...(typeof readMore.href === "string" ? { buttonLink: readMore.href } : {}),
    items: (Array.isArray(d.cards) ? (d.cards as Obj[]) : []).map((c, i) => ({ icon: icons[i % icons.length], title: text(c.title), description: text(c.body) })),
  };
}

/**
 * What the Banner card of the page editor shows before the banner has been saved: the hero the public page shows
 * today (the home `hero` section if it has content, else the design's hero for the page). Nothing is stored until
 * the editor saves, so the website does not change by opening the editor.
 */
export function bannerSeed(pageKey: PageKey, heroData: Obj | null | undefined): Obj | undefined {
  if (pageKey === "home") {
    const d = heroData ?? (FALLBACK_SECTIONS.home ?? []).find((s) => s.sectionKey === "hero")?.data;
    if (!d) return undefined;
    const ctas = buttons(Array.isArray(d.actions) && d.actions.length ? d.actions : d.cta ? [d.cta] : []);
    return {
      layout: "image-right",
      heading: text(d.title),
      supportingText: text(d.subtitle),
      ...(typeof d.backgroundImageId === "string" && d.backgroundImageId ? { imageId: d.backgroundImageId } : {}),
      ...(ctas.length ? { ctas } : {}),
    };
  }
  if (pageKey === "about" && heroData) {
    // The About hero of the website is the published "overview" section: the Banner card opens with that.
    const ctas = buttons(heroData.actions);
    return {
      layout: "image-right",
      heading: text(heroData.heading),
      supportingText: text(heroData.eyebrow),
      description: text(heroData.body),
      ...(typeof heroData.imageId === "string" && MEDIA_ID.test(heroData.imageId) ? { imageId: heroData.imageId } : {}),
      ...(ctas.length ? { ctas } : {}),
    };
  }
  const d = (FALLBACK_SECTIONS[pageKey] ?? []).find((s) => s.sectionKey === "page-hero" || s.sectionKey === "about-hero")?.data;
  if (!d) return undefined;
  const ctas = buttons(Array.isArray(d.actions) && d.actions.length ? d.actions : [d.primary, d.secondary].filter(Boolean));
  return {
    layout: "image-right",
    heading: join(text(d.title), text(d.titleAccent)),
    supportingText: text(d.eyebrow),
    description: text(d.body),
    ...(ctas.length ? { ctas } : {}),
  };
}

/** Design content in the shape an editor form can hold: Marathi filled in, site picture files left out. */
function formReady(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(formReady).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const o = v as Obj;
    const keys = Object.keys(o);
    if (keys.length > 0 && keys.every((k) => k === "en" || k === "mr")) return text(o);
    const out: Obj = {};
    for (const k of keys) {
      const val = o[k];
      // Pictures of the design are files of the website ("/images/…"), not uploads: the field starts empty and the
      // public page keeps the design picture until one is uploaded.
      if (/Ids?$/.test(k)) {
        if (typeof val === "string" && MEDIA_ID.test(val)) out[k] = val;
        else if (Array.isArray(val)) out[k] = val.filter((x) => typeof x === "string" && MEDIA_ID.test(x));
        continue;
      }
      if (typeof val === "string" && val.startsWith("/images/")) continue;
      const next = formReady(val);
      if (next !== undefined) out[k] = next;
    }
    return out;
  }
  return v;
}

const bi = (en: string, mr: string): Text => ({ en, mr });
const rows = (v: unknown): Obj[] => (Array.isArray(v) ? (v as Obj[]) : []);
const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
const pick = <T,>(list: readonly T[], i: number): T => list[i % list.length]!;
/** Drop the keys that have no value, so optional fields stay absent instead of being stored empty. */
const compact = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== ""));
/** "+91 12345 67890" → "+911234567890" (the form of a phone number the editor stores). */
const phoneOf = (v: unknown): string | undefined => {
  const p = String(v ?? "").replace(/[^\d+]/g, "");
  return /^\+?\d{10,15}$/.test(p) ? p : undefined;
};
/** "10:00 AM - 12:00 PM" → ["10:00", "12:00"]. */
function clockRange(v: unknown): [string | undefined, string | undefined] {
  const out = [...String(v ?? "").matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)/gi)].map((m) => {
    const h = (Number(m[1]) % 12) + (m[3]!.toUpperCase() === "PM" ? 12 : 0);
    return `${String(h).padStart(2, "0")}:${m[2]}`;
  });
  return [out[0], out[1]];
}
/** "100% Coverage" → value "100%" + unit "Coverage" (Marathi unit from the same split of the Marathi text). */
function valueAndUnit(v: unknown): { value: string; unit?: Text } {
  const t = text(v) ?? { en: String(v ?? "") };
  const [value = "", ...rest] = (t.en ?? "").split(" ");
  const mrParts = (t.mr ?? "").split(" ");
  const unitEn = rest.join(" ");
  const unitMr = mrParts.length > 1 ? mrParts.slice(1).join(" ") : (marathiFor(unitEn) ?? "");
  return { value: value.slice(0, 40), ...(unitEn ? { unit: { en: unitEn, mr: unitMr } } : {}) };
}

const STAT_ICONS = ["users", "house", "droplets", "zap", "recycle", "lightbulb", "road", "bus", "health", "school", "tree", "building"] as const;
const CATEGORY_ICONS = ["users", "heart", "sprout", "health", "education", "building"] as const;
const ACCENTS = ["#135130", "#F5871F", "#1A62E0", "#7B2CBF"] as const;

/**
 * Sections whose design block has another key (and another shape): the design content of that block, rewritten into
 * the fields of the section, so these cards also open with what the website shows today.
 */
type BridgeCtx = { officeEmail?: string; weatherPlace?: string };
const BRIDGES: Partial<Record<PageKey, Record<string, (block: (key: string) => Obj | undefined, ctx: BridgeCtx) => Obj | undefined>>> = {
  home: {
    // Live weather: only the place is typed (the card shows the shown place, the provider looks up the other).
    weather: (b, ctx) => {
      const shown = text(b("weather")?.location)?.en;
      return { ...(shown ? { location: shown } : {}), ...(ctx.weatherPlace ? { place: ctx.weatherPlace } : {}) };
    },
  },
  environment: {
    "weather-update": (b) => {
      const d = b("weather-update");
      return d && { title: d.title, ...(d.location ? { location: d.location } : {}) };
    },
  },
  infrastructure: {
    "top-stats": (b) => {
      const d = b("facility-grid");
      return d && { heading: d.heading, items: rows(d.items).map((i, n) => ({ icon: pick(STAT_ICONS, n), title: i.label, ...valueAndUnit(i.value), visible: true })) };
    },
  },
  projects: {
    "top-stats": (b) => {
      const d = b("quick-stats");
      return d && { items: rows(d.items).map((i, n) => compact({ icon: str(i.icon) ?? pick(STAT_ICONS, n), title: i.label, value: String(i.value ?? ""), unit: i.unit, visible: true })) };
    },
  },
  services: {
    "service-links": (b) => {
      const d = b("rts-grid");
      return d && { items: rows(d.items).map((i) => compact({ icon: "file", title: i.label, description: i.caption, href: i.href, visible: true })) };
    },
    "service-categories": (b) => {
      const d = b("action-cards");
      return (
        d && {
          items: rows(d.items).map((i, n) =>
            compact({ icon: pick(["info", "users", "file", "heart"], n), title: i.title, description: i.body, features: rows(i.bullets).slice(0, 4), buttonText: i.action, buttonLink: i.href, accentColour: pick(ACCENTS, n) }),
          ),
        }
      );
    },
    "top-stats": (b) => {
      const d = b("live-stats");
      return d && { variant: "band", items: rows(d.items).map((i) => compact({ icon: str(i.icon) ?? "file", title: i.title, value: String(i.value ?? ""), background: i.background, visible: i.visible !== false })) };
    },
    help: (b) => {
      const d = b("help-card");
      if (!d) return undefined;
      const hours = text(d.phoneHours)?.en?.slice(0, 120);
      // The design lists questions as links; answers are typed in the editor, so the question list starts empty.
      return { heading: d.heading, subtitle: d.body, contact: [compact({ phone: phoneOf(d.phone), email: str(d.email), hours })], faqs: [] };
    },
  },
  announcements: {
    "announcement-categories": (b) => {
      const d = b("announce-categories");
      return d && { items: rows(d.items).map((i, n) => ({ label: i.label, icon: pick(CATEGORY_ICONS, n) })) };
    },
    calendar: (b) => {
      const d = b("announce-feed");
      return (
        d && {
          title: d.calendarTitle,
          defaultMonthView: "current",
          eventsToShow: 4,
          visible: true,
          events: rows(d.events).map((e) => {
            const [startTime, endTime] = clockRange(e.time);
            return compact({ date: e.date, title: e.title, colour: str(e.color) ?? "#135130", startTime, endTime });
          }),
        }
      );
    },
    "deadline-cards": (b) => {
      const d = b("deadlines-downloads");
      return d && { items: rows(d.deadlines).map((i) => compact({ icon: "calendar", date: (text(i.date)?.en ?? "").slice(0, 60), title: i.title, subtitle: i.caption })) };
    },
    "support-cards": (b) => {
      const d = b("service-strip");
      return d && { heading: d.heading, layout: "strip", items: rows(d.items).map((i, n) => compact({ icon: pick(CATEGORY_ICONS, n), title: i.label, description: i.caption, link: i.href, visible: true })) };
    },
  },
  contact: {
    "contact-cards": (b) => {
      const d = b("contact-cards-figma");
      if (!d) return undefined;
      const l = (d.labels ?? {}) as Obj;
      const reach = [str(d.phone), str(d.email)].filter(Boolean).join("\n");
      return {
        items: [
          { title: l.inquiries, details: { en: reach, mr: reach }, socialLinks: [] },
          { title: l.hours, details: d.hours, socialLinks: [] },
          { title: l.address, details: d.address, socialLinks: [] },
        ].filter((i) => i.title),
      };
    },
  },
  grievance: {
    "complaint-form": (b, { officeEmail }) => ({
      heading: b("grievance-register")?.heading ?? bi("Register Your Complaint", "आपली तक्रार नोंदवा"),
      successMessage: bi("Your complaint has been registered.", "आपली तक्रार नोंदवली गेली आहे."),
      submitButtonText: bi("Submit Complaint", "तक्रार सादर करा"),
      // Complaints go to the office's own address (website settings), never to an address taken from the design.
      ...(officeEmail ? { recipientEmail: officeEmail } : {}),
      captchaEnabled: false,
      allowFileUpload: true,
      maxFileSizeMb: 5,
      allowedFileTypes: ["pdf", "jpg", "jpeg", "png"],
    }),
    "track-complaint": (b) => ({
      heading: b("grievance-track")?.heading ?? bi("Track Your Complaint", "आपल्या तक्रारीची स्थिती"),
      searchLabel: bi("Enter Complaint ID / Mobile Number", "तक्रार क्रमांक / मोबाईल क्रमांक लिहा"),
      placeholder: bi("Complaint ID (GRV-XXXXXXXX) or 10-digit mobile number", "तक्रार क्रमांक (GRV-XXXXXXXX) किंवा १० अंकी मोबाईल क्रमांक"),
      buttonText: bi("Track Status", "स्थिती तपासा"),
      noResultMessage: bi("No complaint found with this code on this website.", "या कोडची तक्रार या संकेतस्थळावर आढळली नाही."),
      errorMessage: bi("Enter a complaint ID like GRV-XXXXXXXX or the 10-digit mobile number used on the complaint.", "GRV-XXXXXXXX असा तक्रार क्रमांक किंवा तक्रारीत दिलेला १० अंकी मोबाईल क्रमांक लिहा."),
    }),
  },
};

/**
 * Texts the website shows from its own wording while a section leaves them empty. The editor needs them filled in to
 * save, so the card opens with the same wording.
 */
const DEFAULTS: Partial<Record<PageKey, Record<string, Obj>>> = {
  grievance: {
    "monthly-report": {
      cardLabels: {
        total: bi("Total Complaints", "एकूण तक्रारी"),
        resolved: bi("Resolved Complaints", "निराकरण झालेल्या तक्रारी"),
        pending: bi("Pending Complaints", "प्रलंबित तक्रारी"),
        resolutionRate: bi("Resolution Percentage", "निराकरण टक्केवारी"),
      },
    },
  },
  contact: {
    "feedback-form": { successMessage: bi("Thank you. Your feedback has been sent to the Gram Panchayat.", "धन्यवाद. आपला अभिप्राय ग्रामपंचायतीकडे पाठवला आहे.") },
    "volunteer-registration": { successMessage: bi("Thank you for registering. The Gram Panchayat will contact you.", "नोंदणीबद्दल धन्यवाद. ग्रामपंचायत आपल्याशी संपर्क साधेल.") },
  },
};

/**
 * What any other section card shows before it has been saved: the design content of the block with the same key (or
 * of the design block the section takes the place of), so the editor changes what is on the website instead of typing
 * it again. Nothing is stored until it is saved.
 */
export function designSeed(pageKey: PageKey, sectionKey: string, slug?: string, officeEmail?: string, weatherPlace?: string): Obj | undefined {
  const block = (key: string) => (FALLBACK_SECTIONS[pageKey] ?? []).find((s) => s.sectionKey === key)?.data;
  const own = block(sectionKey);
  const bridge = BRIDGES[pageKey]?.[sectionKey];
  // A section whose design block has another shape (or other fields) is rewritten by its bridge; the rest open as the block is.
  const d = bridge ? bridge(block, { officeEmail, weatherPlace }) : own ? { ...DEFAULTS[pageKey]?.[sectionKey], ...own } : undefined;
  if (!d) return undefined;
  // "list:success-stories" is a design shorthand for the website's own stories list; the editor stores the address.
  const data = JSON.parse(JSON.stringify(formReady(d)).replaceAll('"list:success-stories"', JSON.stringify(`/${slug ?? ""}/success-stories`))) as Obj;
  const schema = findSection(pageKey, sectionKey)?.schema;
  if (!schema) return data;
  // Fit the design content to what the section can store: drop design-only fields, and list rows whose required
  // picture or file is a site file (the editor would refuse to save them until something is uploaded).
  for (let round = 0; round < 30; round++) {
    const r = schema.safeParse(data);
    if (r.success) break;
    let changed = false;
    for (const issue of r.error.issues) {
      const path = issue.path as (string | number)[];
      if (issue.code === "unrecognized_keys") {
        const at = path.reduce<unknown>((o, k) => (o as Record<string | number, unknown> | undefined)?.[k], data);
        if (at && typeof at === "object") for (const k of (issue as unknown as { keys: string[] }).keys) delete (at as Obj)[k];
        changed = true;
      } else if (typeof path.at(-1) === "string" && /Ids?$/.test(path.at(-1) as string)) {
        const i = path.findLastIndex((k) => typeof k === "number");
        if (i < 0) continue;
        const list = path.slice(0, i).reduce<unknown>((o, k) => (o as Record<string | number, unknown> | undefined)?.[k], data);
        if (Array.isArray(list) && (path[i] as number) < list.length) {
          list.splice(path[i] as number, 1);
          changed = true;
          break; // indexes moved: validate again
        }
      }
    }
    if (!changed) break;
  }
  return data;
}
