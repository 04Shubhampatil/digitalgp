import { FIGMA_HOME_SECTIONS } from "@/content/figma-home";
import { pickText, type Bilingual } from "@/i18n/text";
import { AboutCardsSection } from "./AboutCardsSection";
import type { SectionProps } from "./index";

interface WelcomeData {
  heading?: Bilingual;
  body?: Bilingual;
  imageId?: string;
  /** Optional cards; when the editor has not written any, the design's three cards are shown. */
  cards?: unknown[];
}

const ABOUT_DESIGN = (FIGMA_HOME_SECTIONS.find((s) => s.sectionKey === "about-cards")?.data ?? {}) as Record<string, unknown>;

/**
 * Backend `welcome` section rendered as the Figma "About Savardari" block (375:13045): centred heading with the
 * village name in green, the body as the subheading, three icon cards, photos and a Read More pill.
 */
export function WelcomeSection(props: SectionProps) {
  const { locale, data } = props;
  const d = data as WelcomeData;
  const heading = pickText(d.heading, locale);
  const body = pickText(d.body, locale);
  if (!heading && !body) return null;

  // The About layout colours the village name green inside the heading ("Welcome to Savardari", "About Savardari").
  const aboutData = {
    ...ABOUT_DESIGN,
    heading: { [locale]: heading || (ABOUT_DESIGN.heading as Bilingual | undefined)?.en },
    subheading: body ? { [locale]: body } : ABOUT_DESIGN.subheading,
    cards: d.cards?.length ? d.cards : ABOUT_DESIGN.cards,
  };
  return <AboutCardsSection {...props} data={aboutData} />;
}
