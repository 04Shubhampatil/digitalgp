import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BeforeAfterGrid } from "@/components/public/sections/KitClient";
import { pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { getPublicProject, listPublicSuccessStories, publicMediaUrl } from "@/lib/api/public";
import { detailHref } from "@/lib/href";
import { loadTenant } from "@/lib/public-tenant";
import { Chip, DetailBody, DetailCard, DetailHero, Facts, Prose, fmtMoney, loadOr404, nf } from "../../_detail/DetailKit";

type Params = Promise<{ tenant: string; projectId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tenant: slug, projectId } = await params;
  const [p, locale] = await Promise.all([getPublicProject(slug, projectId).catch(() => null), getLocale()]);
  return p ? { title: pickText(pair(p.nameEn, p.nameMr), locale as UiLocale) || undefined } : {};
}

const STAGE_TONE = { COMPLETED: "green", ONGOING: "orange", UPCOMING: "blue" } as const;

/** Public project page ("View Details" on Key Projects cards): GET /public/:slug/projects/:id. */
export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { tenant: slug, projectId } = await params;
  const [, locale, t, td] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public"), getTranslations("public.detail")]);
  const ui = locale as UiLocale;
  const p = await loadOr404(() => getPublicProject(slug, projectId));
  const stories = await listPublicSuccessStories(slug, { projectId: p.id, limit: 6 }).catch(() => null);

  const name = pickText(pair(p.nameEn, p.nameMr), ui);
  const ward = pickText(pair(p.wardLabelEn, p.wardLabelMr), ui) || (p.wardNo ? `${t("ward")} ${p.wardNo}` : "");
  const description = pickText(pair(p.descriptionEn, p.descriptionMr), ui);
  const outcomeShort = pickText(pair(p.outcomeShortEn, p.outcomeShortMr), ui);
  const outcome = pickText(pair(p.outcomeEn, p.outcomeMr), ui);
  const cover = p.coverImageId ?? p.afterImageId;
  const hasCompare = !!(p.beforeImageId && p.afterImageId);
  const back = { href: `${pageHref(slug, "projects")}#project-showcase`, label: td("back", { page: t("projects") }) };

  return (
    <main>
      <DetailHero
        eyebrow={t("projects")}
        title={name}
        back={back}
        imageUrl={cover ? publicMediaUrl(slug, cover) : undefined}
        chips={
          <>
            <Chip tone={STAGE_TONE[p.stage]}>{t(`projectBadge.${p.stage}`)}</Chip>
            {ward && (
              <Chip>
                <MapPin className="size-3.5" aria-hidden /> {ward}
              </Chip>
            )}
            {p.year && <Chip tone="grey">{p.year}</Chip>}
          </>
        }
      >
        {outcomeShort && <p className="max-w-[620px] text-[16px] leading-[26px] font-medium text-[#135130]">{outcomeShort}</p>}
      </DetailHero>
      <DetailBody
        main={
          <>
            <DetailCard title={td("overview")}>{description ? <Prose text={description} /> : <p className="text-[14px] text-[#414141]">{td("noDetails")}</p>}</DetailCard>
            {outcome && (
              <DetailCard title={t("outcome")}>
                <Prose text={outcome} />
              </DetailCard>
            )}
            {hasCompare && (
              <DetailCard title={td("beforeAfter")}>
                <BeforeAfterGrid items={[{ label: td("dragHint"), beforeUrl: publicMediaUrl(slug, p.beforeImageId!), afterUrl: publicMediaUrl(slug, p.afterImageId!), height: 380 }]} before={t("before")} after={t("after")} />
              </DetailCard>
            )}
            {!hasCompare && (p.beforeImageId || p.afterImageId) && (
              <DetailCard title={td("beforeAfter")}>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    [p.beforeImageId, t("before")],
                    [p.afterImageId, t("after")],
                  ]
                    .filter(([id]) => id)
                    .map(([id, label]) => (
                      <figure key={id}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
                        <img src={publicMediaUrl(slug, id!)} alt="" className="h-[240px] w-full rounded-[10px] object-cover" loading="lazy" />
                        <figcaption className="mt-2 text-center text-[13px] text-[#414141]">{label}</figcaption>
                      </figure>
                    ))}
                </div>
              </DetailCard>
            )}
            {stories && stories.data.length > 0 && (
              <DetailCard title={td("relatedStories")}>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {stories.data.map((s) => (
                    <li key={s.id}>
                      <Link href={detailHref(slug, "success-stories", s.id)} className="block rounded-[10px] border border-black/15 p-4 hover:bg-[#f4faf6]">
                        <span className="block text-[15px] font-semibold text-black">{pickText(pair(s.titleEn, s.titleMr), ui)}</span>
                        <span className="mt-1 block text-[13px] text-[#414141]">{pickText(pair(s.summaryEn, s.summaryMr), ui)}</span>
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
          <DetailCard title={td("keyFacts")} tone="green">
            <Facts
              tone="green"
              rows={[
                { label: td("stage"), value: t(`projectBadge.${p.stage}`) },
                { label: t("ward"), value: ward },
                { label: td("year"), value: p.year ? String(p.year) : "" },
                { label: t("budget"), value: fmtMoney(ui, p.budget) },
                { label: t("familiesBenefited"), value: p.familiesBenefited !== null ? p.familiesBenefited.toLocaleString(nf(ui)) : "" },
                { label: t("outcome"), value: outcomeShort },
              ]}
            />
          </DetailCard>
        }
      />
    </main>
  );
}
