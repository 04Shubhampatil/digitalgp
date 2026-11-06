import { Building2, Landmark, MapPinned, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { getPublicSchemeCoverage, listPublicSchemes, publicMediaUrl } from "@/lib/api/public";
import { detailHref, resolveHref } from "@/lib/href";
import { SchemeCoverageClient, type CoverageLabels, type CoverageView, type CoverageWard } from "./CoverageMap";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;
interface Btn {
  label?: B;
  href?: string;
}

/** Schemes page blocks (Figma "4. Government Schemes & Beneficiary"). */

const LEVEL_ICONS: LucideIcon[] = [Landmark, MapPinned, Building2];

/** `scheme-levels`: Central / State / District counts. Counts come from published schemes when any exist. */
export async function SchemeLevelsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { items?: { level?: "CENTRAL" | "STATE" | "DISTRICT"; label?: B; count?: number; iconUrl?: string }[] };
  const live = await listPublicSchemes(slug, { limit: 100 }).catch(() => null);
  const counts: Record<string, number> = {};
  for (const s of live?.data ?? []) counts[s.level] = (counts[s.level] ?? 0) + 1;
  const hasLive = (live?.data.length ?? 0) > 0;
  return (
    // Figma: one white card (62..1380, 138px tall, 16px radius), three equal cells; the first cell carries the 8px green underline.
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[74px] lg:px-[62px]">
      <ul className="grid overflow-hidden rounded-[16px] bg-white shadow-[0_0_16px_rgba(0,0,0,0.18)] md:grid-cols-3">
        {(d.items ?? []).map((it, i) => {
          const Icon = LEVEL_ICONS[i % LEVEL_ICONS.length]!;
          const n = hasLive ? (counts[it.level ?? ""] ?? 0) : (it.count ?? 0);
          const msg = t("schemesAvailable", { n });
          const at = msg.indexOf(String(n));
          return (
            <li key={i} className="relative flex h-[110px] items-center justify-center gap-[34px] md:h-[138px]">
              {it.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- static design asset
                <img src={it.iconUrl} alt="" width={75} height={79} className="h-[79px] w-[75px] shrink-0" />
              ) : (
                <span aria-hidden className="flex size-[64px] shrink-0 items-center justify-center rounded-[14px] bg-[#e9f4e9] text-[#135130]">
                  <Icon className="size-8" strokeWidth={1.7} />
                </span>
              )}
              <div className="leading-[19px]">
                <p className="text-[14px] font-bold whitespace-nowrap text-black">{pickText(it.label, locale)}</p>
                <p className="mt-2 text-[14px] whitespace-nowrap text-black">
                  {at >= 0 ? (
                    <>
                      {msg.slice(0, at)}
                      <span className="font-semibold text-[#135130]">{n}</span>
                      {msg.slice(at + String(n).length)}
                    </>
                  ) : (
                    msg
                  )}
                </p>
              </div>
              {i === 0 && <span aria-hidden className="absolute bottom-0 left-0 h-[7px] w-[93%] bg-[#135130]" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Design pictures of the scheme cards (Figma: house, worker, farmer, house, graduation cap), picked by the scheme's category / name. */
const CARD_PICTURES: { re: RegExp; src: string }[] = [
  { re: /employ|mgnrega|nrega|job|रोजगार/i, src: "/images/figma/pages/sch-card-2.png" },
  { re: /kisan|farm|agri|शेत|किसान|कृषी/i, src: "/images/figma/pages/sch-card-3.png" },
  { re: /scholar|educat|शिष्य|शिक्षण/i, src: "/images/figma/pages/sch-card-5.png" },
  { re: /./, src: "/images/figma/pages/sch-card-1.png" },
];

interface SchemeCard {
  name: string;
  category?: string;
  level?: string;
  description: string;
  benefitLabel?: string;
  benefitValue?: string;
  benefitCaption?: string;
  eligibility?: string;
  process?: string;
  href?: string;
  /** Scheme page of a published record. */
  detail?: string;
}

/**
 * `scheme-showcase`: "Featured Schemes" cards. Published schemes replace the Figma placeholders as
 * soon as the Gram Panchayat has any.
 */
export async function SchemeShowcaseSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as {
    heading?: B;
    benefitsLabel?: B;
    items?: { name?: B; category?: B; level?: B; description?: B; benefitCaption?: B; benefitValue?: B }[];
    viewAll?: Btn;
    /** Where "View Details" goes on a card that has no scheme record behind it. */
    detailsHref?: string;
  };
  const live = await listPublicSchemes(slug, { limit: 100 }).catch(() => null);
  const fmt = new Intl.NumberFormat(locale === "mr" ? "mr-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const cards: SchemeCard[] =
    live && live.data.length > 0
      ? live.data.map((s) => ({
          name: pickText(pair(s.nameEn, s.nameMr), locale),
          category: s.category ?? undefined,
          level: t(`schemeLevelShort.${s.level}`),
          description: pickText(pair(s.descriptionEn, s.descriptionMr), locale),
          benefitValue: s.amountDisbursed ? fmt.format(Number(s.amountDisbursed)) : s.beneficiaryCount !== null ? s.beneficiaryCount.toLocaleString("en-IN") : undefined,
          benefitCaption: s.amountDisbursed ? t("amountDisbursed") : s.beneficiaryCount !== null ? t("beneficiaries") : undefined,
          eligibility: pickText(pair(s.eligibilityEn, s.eligibilityMr), locale) || undefined,
          process: pickText(pair(s.processEn, s.processMr), locale) || undefined,
          href: s.externalUrl ?? undefined,
          detail: detailHref(slug, "schemes", s.id),
        }))
      : (d.items ?? []).map((s) => ({
          name: pickText(s.name, locale),
          category: pickText(s.category, locale),
          level: pickText(s.level, locale),
          description: pickText(s.description, locale),
          benefitValue: pickText(s.benefitValue, locale),
          benefitCaption: pickText(s.benefitCaption, locale),
        }));
  if (cards.length === 0) return null;
  const btn = "inline-flex h-[45px] w-[176px] items-center justify-center rounded-full border-[0.77px] border-[#135130] text-[18px] whitespace-nowrap text-[#135130] hover:bg-[#135130]/5";
  return (
    <section className="bg-cream pt-8 pb-10 lg:pt-[51px] lg:pb-[47px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <ul className="mt-5 flex flex-wrap justify-center gap-x-[9.5px] gap-y-5">
          {cards.map((c, i) => {
            const pic = CARD_PICTURES.find((x) => x.re.test(`${c.name} ${c.category ?? ""}`))!.src;
            return (
              <li key={i} className="flex min-h-[473px] w-[256px] flex-col items-center rounded-[18.4px] border-[1.84px] border-[#414141]/15 bg-white px-[29px] pt-[22px] pb-[34px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                <img src={pic} alt="" width={87} height={79} className="h-[79px] w-[87px] shrink-0" />
                <h3 className="mt-[21px] flex h-[45px] w-[226px] items-start justify-center pt-[7px] text-center text-[14px] leading-[21px] font-semibold text-black" title={c.name}>
                  <span className="line-clamp-2">{c.name}</span>
                </h3>
                <p className="mt-[19px] flex h-[29px] w-full gap-5 self-start text-[12px] font-semibold">
                  {c.category && <span className="inline-flex h-[29px] items-center rounded-full bg-[#135130]/10 px-1.5 whitespace-nowrap text-[#135130]">{c.category}</span>}
                  {c.level && <span className="inline-flex h-[29px] items-center rounded-full bg-[#ff9933]/10 px-1.5 whitespace-nowrap text-[#ff9933]">{c.level}</span>}
                </p>
                <p className="mt-[23px] line-clamp-2 h-[52px] w-full text-[14.7px] leading-[26px] text-[#414141]" title={c.description}>
                  {c.description}
                </p>
                {c.benefitValue && (
                  <div className="mt-[11px] w-full text-[14.7px] leading-[27.5px] text-[#414141]">
                    <p className="font-medium">{pickText(d.benefitsLabel, locale)}</p>
                    <p className="text-[18.4px] font-semibold">{c.benefitValue}</p>
                    <p>{c.benefitCaption}</p>
                  </div>
                )}
                <div className="mt-auto pt-4">
                  {c.detail ? (
                    // Published scheme: its own page (eligibility, how to apply, apply link, coverage).
                    <Link href={c.detail} className={btn}>
                      {t("viewDetails")}
                    </Link>
                  ) : c.href ? (
                    <a href={c.href} target="_blank" rel="noopener" className={btn}>
                      {t("viewDetails")}
                    </a>
                  ) : (
                    // Placeholder card without a scheme record: open the page's "Scheme Information" block.
                    <Link href={resolveHref(d.detailsHref ?? "page:schemes#link-cards", slug)} className={btn}>
                      {t("viewDetails")}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {d.viewAll?.href && (
          <div className="mt-[31px] flex justify-center">
            <Link href={resolveHref(d.viewAll.href, slug)} className="inline-flex h-[33px] w-[135px] items-center justify-center rounded-[24px] border border-[#135130] bg-[#135130] text-[12.5px] font-medium whitespace-nowrap text-white hover:opacity-90">
              {pickText(d.viewAll.label, locale)}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * `coverage-map`: "Scheme Coverage Map". With published schemes the "Select Scheme" dropdown switches between them
 * (GET /public/:slug/schemes/coverage?schemeId=: beneficiaries per ward, totalBeneficiaries, mapImageId); the first
 * scheme is shown first. Without published schemes the section's own wards / picture are shown (the Figma picture
 * for the placeholder).
 */
export async function SchemeCoverageSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public.cms");
  const td = await getTranslations("public.detail");
  const d = data as { heading?: B; subheading?: B; mapImageId?: string; wards?: { wardNo?: string; households?: number; beneficiaries?: number; colour?: string }[] };
  const live = await listPublicSchemes(slug, { limit: 100 }).catch(() => null);
  const schemes = (live?.data ?? []).map((s) => ({ id: s.id, name: pickText(pair(s.nameEn, s.nameMr), locale) }));
  const isDesignPicture = !!d.mapImageId?.startsWith("/");
  const sectionMap = d.mapImageId ? (isDesignPicture ? d.mapImageId : publicMediaUrl(slug, d.mapImageId)) : undefined;
  const sectionWards: CoverageWard[] = (d.wards ?? []).map((w) => ({ wardNo: w.wardNo ?? "", households: w.households ?? 0, beneficiaries: w.beneficiaries ?? null, colour: w.colour }));

  let initialId = "";
  let initial: CoverageView;
  if (schemes.length > 0) {
    initialId = schemes[0]!.id;
    const cov = await getPublicSchemeCoverage(slug, initialId).catch(() => null);
    initial = cov
      ? { wards: cov.wards, totalHouseholds: cov.totalHouseholds, totalBeneficiaries: cov.totalBeneficiaries, mapUrl: cov.mapImageId ? publicMediaUrl(slug, cov.mapImageId) : undefined }
      : { wards: [], totalHouseholds: 0, totalBeneficiaries: null };
  } else {
    if (sectionWards.length === 0 && !sectionMap) return null;
    const benef = sectionWards.filter((w) => w.beneficiaries !== null);
    initial = {
      // The design picture already draws the sample wards; a backend section's wards are drawn as blocks.
      wards: isDesignPicture ? [] : sectionWards,
      totalHouseholds: isDesignPicture ? 0 : sectionWards.reduce((a, w) => a + w.households, 0),
      totalBeneficiaries: isDesignPicture || benef.length === 0 ? null : benef.reduce((a, w) => a + (w.beneficiaries ?? 0), 0),
      mapUrl: sectionMap,
    };
  }
  const labels: CoverageLabels = {
    heading: pickText(d.heading, locale) || t("coverageMap"),
    subheading: pickText(d.subheading, locale) || t("coverageMapSub"),
    selectScheme: td("selectScheme"),
    allSchemes: td("allSchemes"),
    ward: td.raw("wardShort") as string,
    wardNo: td.raw("wardNo") as string,
    clickWard: td("clickWard"),
    zoomIn: td("zoomIn"),
    zoomOut: td("zoomOut"),
    fullscreen: td("fullscreen"),
    households: t("householdsCol"),
    beneficiaries: t("beneficiariesCol"),
    totalBeneficiaries: td("totalBeneficiaries"),
    totalHouseholds: td("totalHouseholds"),
    legend: td("beneficiaryHouseholds"),
    empty: td("noCoverage"),
  };
  // A backend picture stays the fallback for a scheme without ward figures; the design picture never stands in for real data.
  const fallbackPicture = isDesignPicture ? undefined : sectionMap;
  const client = (
    <SchemeCoverageClient slug={slug} schemes={schemes} initialSchemeId={initialId} initial={initial} sectionMapUrl={fallbackPicture} labels={labels} locale={locale} card={!!siblings?.["link-cards"]} />
  );
  if (siblings?.["link-cards"]) return client;
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-8">{client}</div>
    </section>
  );
}
