import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { isPageKey } from "@/config/pages";
import { pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { getPublicProject, getPublicScheme, getPublicSuccessStory, publicMediaUrl } from "@/lib/api/public";
import { detailHref } from "@/lib/href";
import { loadTenant } from "@/lib/public-tenant";
import { DetailBody, DetailCard, DetailHero, Prose, fmtDate, loadOr404, pillGhost } from "../../_detail/DetailKit";

type Params = Promise<{ tenant: string; storyId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tenant: slug, storyId } = await params;
  const [s, locale] = await Promise.all([getPublicSuccessStory(slug, storyId).catch(() => null), getLocale()]);
  return s ? { title: pickText(pair(s.titleEn, s.titleMr), locale as UiLocale) || undefined } : {};
}

/** Public success story page ("Read Story"): GET /public/:slug/success-stories/:id. */
export default async function SuccessStoryPage({ params }: { params: Params }) {
  const { tenant: slug, storyId } = await params;
  const [, locale, t, td] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public"), getTranslations("public.detail")]);
  const ui = locale as UiLocale;
  const s = await loadOr404(() => getPublicSuccessStory(slug, storyId));
  // Linked records are only shown when they are published too (the detail reads 404 otherwise).
  const [project, scheme] = await Promise.all([
    s.projectId ? getPublicProject(slug, s.projectId).catch(() => null) : null,
    s.schemeId ? getPublicScheme(slug, s.schemeId).catch(() => null) : null,
  ]);

  const title = pickText(pair(s.titleEn, s.titleMr), ui);
  const summary = pickText(pair(s.summaryEn, s.summaryMr), ui);
  const body = pickText(pair(s.bodyEn, s.bodyMr), ui);
  const quote = pickText(pair(s.quoteEn, s.quoteMr), ui);
  const role = pickText(pair(s.personRoleEn, s.personRoleMr), ui);
  const home = isPageKey(s.pageKey) ? s.pageKey : "home";
  const back = { href: home === "home" ? `/${slug}` : `${pageHref(slug, home)}#success-stories`, label: td("back", { page: t(home) }) };
  const photo = s.photoId ? publicMediaUrl(slug, s.photoId) : undefined;

  return (
    <main>
      <DetailHero eyebrow={td("successStory")} title={title} back={back} imageUrl={photo}>
        {summary && <p className="max-w-[640px] text-[16px] leading-[26px] text-[#414141]">{summary}</p>}
        {(s.personName || s.location) && (
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
            {s.personName && <span className="font-semibold text-[#135130]">{s.personName}</span>}
            {role && <span className="text-[#414141]">{role}</span>}
            {s.location && (
              <span className="inline-flex items-center gap-1 text-[#138808]">
                <MapPin className="size-4" aria-hidden /> {s.location}
              </span>
            )}
          </p>
        )}
      </DetailHero>
      <DetailBody
        main={
          <>
            {quote && (
              <figure className="rounded-[14px] bg-[#135130] px-8 py-7 text-white">
                <span aria-hidden className="block h-8 font-serif text-[64px] leading-[56px] font-bold text-[#f3d828]">
                  &ldquo;
                </span>
                <blockquote className="mt-2 text-[20px] leading-[32px] font-medium">{quote}</blockquote>
                {s.personName && (
                  <figcaption className="mt-4 text-[14px] text-white/85">
                    — {s.personName}
                    {role && `, ${role}`}
                  </figcaption>
                )}
              </figure>
            )}
            <DetailCard>{body ? <Prose text={body} /> : <p className="text-[15px] leading-[26px] text-[#414141]">{summary}</p>}</DetailCard>
          </>
        }
        side={
          project || scheme || s.publishedAt ? (
            <>
              {project && (
                <DetailCard title={td("relatedProject")}>
                  <p className="text-[16px] font-semibold text-black">{pickText(pair(project.nameEn, project.nameMr), ui)}</p>
                  {pickText(pair(project.outcomeShortEn, project.outcomeShortMr), ui) && <p className="mt-1 text-[13px] text-[#414141]">{pickText(pair(project.outcomeShortEn, project.outcomeShortMr), ui)}</p>}
                  <Link href={detailHref(slug, "projects", project.id)} className={`${pillGhost} mt-4`}>
                    {t("viewDetails")}
                  </Link>
                </DetailCard>
              )}
              {scheme && (
                <DetailCard title={td("relatedScheme")}>
                  <p className="text-[16px] font-semibold text-black">{pickText(pair(scheme.nameEn, scheme.nameMr), ui)}</p>
                  {scheme.category && <p className="mt-1 text-[13px] text-[#414141]">{scheme.category}</p>}
                  <Link href={detailHref(slug, "schemes", scheme.id)} className={`${pillGhost} mt-4`}>
                    {t("viewDetails")}
                  </Link>
                </DetailCard>
              )}
              {s.publishedAt && <p className="px-2 text-[13px] text-[#414141]">{td("publishedOn", { date: fmtDate(ui, s.publishedAt) })}</p>}
            </>
          ) : undefined
        }
      />
    </main>
  );
}
