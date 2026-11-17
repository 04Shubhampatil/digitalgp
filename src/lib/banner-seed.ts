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
