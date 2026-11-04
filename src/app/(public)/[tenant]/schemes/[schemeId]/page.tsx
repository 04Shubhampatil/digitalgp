import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { getPublicScheme, listPublicSuccessStories, publicMediaUrl } from "@/lib/api/public";
import { detailHref } from "@/lib/href";
import { loadTenant } from "@/lib/public-tenant";
import { Chip, DetailBody, DetailCard, DetailHero, Facts, Prose, fmtMoney, loadOr404, nf, pillGhost, pillPrimary } from "../../_detail/DetailKit";

type Params = Promise<{ tenant: string; schemeId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tenant: slug, schemeId } = await params;
  const [s, locale] = await Promise.all([getPublicScheme(slug, schemeId).catch(() => null), getLocale()]);
  return s ? { title: pickText(pair(s.nameEn, s.nameMr), locale as UiLocale) || undefined } : {};
}

/** Public scheme page ("View Details" on Featured Schemes cards): GET /public/:slug/schemes/:id. */
export default async function SchemeDetailPage({ params }: { params: Params }) {
  const { tenant: slug, schemeId } = await params;
  const [, locale, t, td] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public"), getTranslations("public.detail")]);
  const ui = locale as UiLocale;
  const s = await loadOr404(() => getPublicScheme(slug, schemeId));
  const stories = await listPublicSuccessStories(slug, { schemeId: s.id, limit: 6 }).catch(() => null);

  const name = pickText(pair(s.nameEn, s.nameMr), ui);
  const description = pickText(pair(s.descriptionEn, s.descriptionMr), ui);
  const eligibility = pickText(pair(s.eligibilityEn, s.eligibilityMr), ui);
  const process = pickText(pair(s.processEn, s.processMr), ui);
  const money = fmtMoney(ui, s.amountDisbursed);
  const back = { href: `${pageHref(slug, "schemes")}#scheme-showcase`, label: td("back", { page: t("schemes") }) };
  const apply = s.externalUrl ? (
    <a href={s.externalUrl} target="_blank" rel="noopener noreferrer" className={pillPrimary}>
      {t("applyOnline")} <ExternalLink className="size-4" aria-hidden />
    </a>
  ) : null;

  return (
    <main>
      <DetailHero
        eyebrow={t("schemes")}
        title={name}
        back={back}
        chips={
          <>
            {s.category && <Chip>{s.category}</Chip>}
            <Chip tone="orange">{t(`schemeLevel.${s.level}`)}</Chip>
            {s.isShared && <Chip tone="grey">{t("sharedScheme")}</Chip>}
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          {apply}
          <Link href={`${pageHref(slug, "schemes")}#coverage-map`} className={pillGhost}>
            {td("coverage")}
          </Link>
        </div>
      </DetailHero>
      <DetailBody
        main={
          <>
            <DetailCard title={td("aboutScheme")}>{description ? <Prose text={description} /> : <p className="text-[14px] text-[#414141]">{td("noDetails")}</p>}</DetailCard>
            {eligibility && (
              <DetailCard title={t("eligibility")}>
                <Prose text={eligibility} />
              </DetailCard>
            )}
            {process && (
              <DetailCard title={t("howToApply")}>
                <Prose text={process} />
                {apply && <div className="mt-5">{apply}</div>}
              </DetailCard>
            )}
            {s.mapImageId && (
              <DetailCard title={td("coverage")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
                <img src={publicMediaUrl(slug, s.mapImageId)} alt={td("coverage")} className="h-auto w-full rounded-[10px]" loading="lazy" />
              </DetailCard>
            )}
            {stories && stories.data.length > 0 && (
              <DetailCard title={td("relatedStories")}>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {stories.data.map((x) => (
                    <li key={x.id}>
                      <Link href={detailHref(slug, "success-stories", x.id)} className="block rounded-[10px] border border-black/15 p-4 hover:bg-[#f4faf6]">
                        <span className="block text-[15px] font-semibold text-black">{pickText(pair(x.titleEn, x.titleMr), ui)}</span>
                        <span className="mt-1 block text-[13px] text-[#414141]">{pickText(pair(x.summaryEn, x.summaryMr), ui)}</span>
                        <span className="mt-2 block text-[13px] font-semibold text-[#135130]">{td("readStory")} →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </DetailCard>
            )}
          </>
        }
        side={
          <DetailCard title={td("benefits")} tone="green">
            <Facts
              tone="green"
              rows={[
                { label: td("category"), value: s.category ?? "" },
                { label: td("level"), value: t(`schemeLevel.${s.level}`) },
                { label: t("beneficiaries"), value: s.beneficiaryCount !== null ? s.beneficiaryCount.toLocaleString(nf(ui)) : "" },
                { label: s.disbursedFinancialYear ? td("amountDisbursedFy", { fy: s.disbursedFinancialYear }) : t("amountDisbursed"), value: money },
              ]}
            />
            {s.beneficiaryCount === null && !money && <p className="text-[14px] text-white/85">{td("noFigures")}</p>}
          </DetailCard>
        }
      />
    </main>
  );
}
