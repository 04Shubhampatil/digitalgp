import { localizeDesign } from "@/content/design-names";
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

  // The design's heading is "About <village>" (the name in green). An editor heading that is not an "About …"
  // heading (e.g. "Welcome to Savardari", which is the video block's title) is replaced so the block is recognisable.
  const name = props.tenantName ?? "";
  const isAbout = /^about\b/i.test(heading) || /विषयी|बद्दल|माहिती/.test(heading);
  const designHeading = locale === "mr" ? `${name} विषयी`.trim() : `About ${name}`.trim();
  // The block's design cards and address are written about the design's village: name this website's own instead.
  const design = localizeDesign(ABOUT_DESIGN, props.designNames ?? null);
  const aboutData = {
    ...design,
    heading: { [locale]: isAbout ? heading : designHeading },
    subheading: body ? { [locale]: body } : design.subheading,
    cards: d.cards?.length ? d.cards : design.cards,
    // The section's photo is the large picture of the collage.
    ...(d.imageId ? { mainImageId: d.imageId } : {}),
  };
  return <AboutCardsSection {...props} data={aboutData} />;
}
