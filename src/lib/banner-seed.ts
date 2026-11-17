import type { PageKey } from "@/config/pages";
import { FALLBACK_SECTIONS } from "@/content/fallback";
import { marathiFor } from "@/i18n/mr-fallback";

type Obj = Record<string, unknown>;
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
    .slice(0, 2)
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
