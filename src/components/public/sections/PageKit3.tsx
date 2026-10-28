import { ArrowRight, Building2, GraduationCap, House, Landmark, MapPinned, Sprout, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { listPublicSchemes } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
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
  const d = data as { items?: { level?: "CENTRAL" | "STATE" | "DISTRICT"; label?: B; count?: number }[] };
  const live = await listPublicSchemes(slug, { limit: 100 }).catch(() => null);
  const counts: Record<string, number> = {};
  for (const s of live?.data ?? []) counts[s.level] = (counts[s.level] ?? 0) + 1;
  const hasLive = (live?.data.length ?? 0) > 0;
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[69px] lg:px-[62px]">
      <ul className="grid overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.18)] md:grid-cols-3">
        {(d.items ?? []).map((it, i) => {
          const Icon = LEVEL_ICONS[i % LEVEL_ICONS.length]!;
          const n = hasLive ? (counts[it.level ?? ""] ?? 0) : (it.count ?? 0);
          return (
            <li key={i} className={`flex items-center gap-5 px-8 py-6 ${i === 0 ? "border-b-[3px] border-[#135130] bg-[#f7f9fb]" : ""}`}>
              <span aria-hidden className="flex size-[56px] shrink-0 items-center justify-center rounded-full bg-[#e9f4e9] text-[#135130]">
                <Icon className="size-7" strokeWidth={1.7} />
              </span>
              <div>
                <p className="text-[18px] leading-[26px] font-semibold text-black">{pickText(it.label, locale)}</p>
                <p className="text-[14px] font-medium text-[#135130]">{t("schemesAvailable", { n })}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const CATEGORY_ICONS: { re: RegExp; Icon: LucideIcon; bg: string; fg: string }[] = [
  { re: /awas|house|housing|आवास/i, Icon: House, bg: "bg-[#fdeedd]", fg: "text-[#d9531e]" },
  { re: /kisan|farm|agri|शेत|किसान/i, Icon: Sprout, bg: "bg-[#e3f1d4]", fg: "text-[#3f8f26]" },
  { re: /scholar|educat|शिष्य|शिक्षण/i, Icon: GraduationCap, bg: "bg-[#e8eef6]", fg: "text-[#2a3f6f]" },
  { re: /./, Icon: Users, bg: "bg-[#e9f4e9]", fg: "text-[#135130]" },
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
  };
  const live = await listPublicSchemes(slug, { limit: 100 }).catch(() => null);
  const fmt = new Intl.NumberFormat(locale === "mr" ? "mr-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const cards: SchemeCard[] =
    live && live.data.length > 0
      ? live.data.map((s) => ({
          name: pickText(pair(s.nameEn, s.nameMr), locale),
          level: t(`schemeLevel.${s.level}`),
          description: pickText(pair(s.descriptionEn, s.descriptionMr), locale),
          benefitValue: s.amountDisbursed ? fmt.format(Number(s.amountDisbursed)) : s.beneficiaryCount !== null ? s.beneficiaryCount.toLocaleString("en-IN") : undefined,
          benefitCaption: s.amountDisbursed ? t("amountDisbursed") : s.beneficiaryCount !== null ? t("beneficiaries") : undefined,
          eligibility: pickText(pair(s.eligibilityEn, s.eligibilityMr), locale) || undefined,
          process: pickText(pair(s.processEn, s.processMr), locale) || undefined,
          href: s.externalUrl ?? undefined,
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
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <div aria-hidden className="mx-auto mt-1 h-0.5 w-16 bg-[#135130]" />
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((c, i) => {
            const k = CATEGORY_ICONS.find((x) => x.re.test(`${c.name} ${c.category ?? ""}`))!;
            return (
              <li key={i} className="flex flex-col items-center rounded-[10px] border border-black/15 bg-white px-5 pt-6 pb-5 text-center shadow-[0_0_14px_rgba(0,0,0,0.12)]">
                <span aria-hidden className={`flex size-[64px] items-center justify-center rounded-full ${k.bg} ${k.fg}`}>
                  <k.Icon className="size-8" strokeWidth={1.7} />
                </span>
                <h3 className="mt-3 text-[14px] leading-5 font-semibold text-black">{c.name}</h3>
                <p className="mt-2 flex flex-wrap justify-center gap-2 text-[10px]">
                  {c.category && <span className="rounded-full bg-[#dcefdc] px-2.5 py-0.5 text-[#135130]">{c.category}</span>}
                  {c.level && <span className="rounded-full bg-[#fff0dc] px-2.5 py-0.5 text-[#f5871f]">{c.level}</span>}
                </p>
                <p className="mt-3 text-[11px] leading-[17px] text-[#414141]">{c.description}</p>
                {c.benefitValue && (
                  <div className="mt-4 w-full text-left text-[11px]">
                    <p className="text-[#414141]">{pickText(d.benefitsLabel, locale)}</p>
                    <p className="mt-1 text-[15px] font-bold text-black">{c.benefitValue}</p>
                    <p className="text-[#414141]">{c.benefitCaption}</p>
                  </div>
                )}
                <div className="mt-auto w-full pt-4">
                  {c.eligibility || c.process ? (
                    <details className="text-left text-[12px]">
                      <summary className="mx-auto inline-flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-full border-[0.6px] border-[#135130] px-4 py-1.5 text-[#135130] [&::-webkit-details-marker]:hidden">
                        {t("viewDetails")} <ArrowRight className="size-3.5" aria-hidden />
                      </summary>
                      {c.eligibility && (
                        <p className="mt-3 whitespace-pre-line text-[#414141]">
                          <strong className="text-black">{t("eligibility")}: </strong>
                          {c.eligibility}
                        </p>
                      )}
                      {c.process && (
                        <p className="mt-2 whitespace-pre-line text-[#414141]">
                          <strong className="text-black">{t("howToApply")}: </strong>
                          {c.process}
                        </p>
                      )}
                      {c.href && (
                        <a href={c.href} target="_blank" rel="noopener" className="mt-2 inline-block font-semibold text-[#135130] hover:underline">
                          {t("applyOnline")}
                        </a>
                      )}
                    </details>
                  ) : c.href ? (
                    <a href={c.href} target="_blank" rel="noopener" className="inline-flex w-full items-center justify-center gap-2 rounded-full border-[0.6px] border-[#135130] px-4 py-1.5 text-[12px] text-[#135130] hover:bg-[#135130]/5">
                      {t("viewDetails")} <ArrowRight className="size-3.5" aria-hidden />
                    </a>
                  ) : (
                    <span className="inline-flex w-full items-center justify-center gap-2 rounded-full border-[0.6px] border-[#135130] px-4 py-1.5 text-[12px] text-[#135130]">
                      {t("viewDetails")} <ArrowRight className="size-3.5" aria-hidden />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {d.viewAll?.href && (
          <div className="mt-8 flex justify-center">
            <Link href={resolveHref(d.viewAll.href, slug)} className="inline-flex rounded-full border border-[#135130] bg-[#135130] px-5 py-2.5 text-[13px] font-medium text-white hover:opacity-90">
              {pickText(d.viewAll.label, locale)}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
