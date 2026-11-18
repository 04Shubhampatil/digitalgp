import type { PageKey } from "@/config/pages";
import { editorSpec } from "@/config/section-editors";

/** What the editor needs to know about a section to decide whether its card is shown. */
interface SectionState {
  sectionKey: string;
  draft?: unknown;
  published?: unknown;
}

/**
 * Cards of the page editor whose block does not exist on the public page (the design has no place for them), so
 * editing them changes nothing the visitor sees. They stay out of the editor until something is saved or published
 * for them, so a card that already holds content is never hidden.
 */
const NO_BLOCK_ON_SITE: Partial<Record<PageKey, readonly string[]>> = {
  culture: ["training-programs"],
  environment: ["top-stats"],
  announcements: ["top-stats"],
};

/**
 * Whether the page editor shows a card for this section. One rule for the editor and the CMS Page Overview, so the
 * "sections pending" count is made of the cards the editor shows and can reach zero.
 */
export function isEditorCard(pageKey: PageKey, section: SectionState, all: readonly SectionState[]): boolean {
  const key = section.sectionKey;
  if (!editorSpec(pageKey, key)) return false;
  const has = (k: string) => all.some((s) => s.sectionKey === k);
  // The Banner card is the page's hero: the older Home "hero" and About "overview" cards fed the same block.
  if (has("banner") && ((pageKey === "home" && key === "hero") || (pageKey === "about" && key === "overview"))) return false;
  // "Our leaders" is not shown on the home page (it lives on About).
  if (pageKey === "home" && key === "leaders") return false;
  // The home About block is edited in the "About the village cards" card; the older "welcome" card fed the same block.
  if (pageKey === "home" && key === "welcome" && has("about-cards")) return false;
  // The About design has no block for the geography figures.
  if (pageKey === "about" && key === "geography") return false;
  if (NO_BLOCK_ON_SITE[pageKey]?.includes(key) && !section.draft && !section.published) return false;
  return true;
}
