import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { StoryDialog } from "@/components/public/sections/cms/StoryDialog";
import { mediaUrl } from "@/components/public/sections/cms/kit";
import type { PageKey } from "@/config/pages";
import { FALLBACK_SECTIONS } from "@/content/fallback";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { listPublicSuccessStories, publicMediaUrl } from "@/lib/api/public";
import { detailHref } from "@/lib/href";
import { loadTenant } from "@/lib/public-tenant";
import { DetailHero } from "../_detail/DetailKit";

type Params = Promise<{ tenant: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("public.cms");
  return { title: t("successStories") };
}

/** Pages whose Figma placeholder stories are shown while that page has no published story of its own. */
const STORY_PAGES: PageKey[] = ["culture", "employment", "education"];

interface Card {
  title: string;
  text: string;
  image?: string;
  href?: string;
}

/**
 * Every success story of the website ("View All Success Stories"): published stories open their story page; the
 * sample stories that a page still shows (no published story there yet) open in a dialog.
 */
export default async function SuccessStoriesPage({ params }: { params: Params }) {
  const { tenant: slug } = await params;
  const [, locale, t, tp, tc, td] = await Promise.all([
    loadTenant(slug),
    getLocale(),
    getTranslations("public.cms"),
    getTranslations("public"),
    getTranslations("common"),
    getTranslations("public.detail"),
  ]);
  const ui = locale as UiLocale;
  const live = (await listPublicSuccessStories(slug, { limit: 50 }).catch(() => null))?.data ?? [];
  const cards: Card[] = live.map((s) => ({
    title: pickText(pair(s.titleEn, s.titleMr), ui),
    text: pickText(pair(s.summaryEn, s.summaryMr), ui) || pickText(pair(s.quoteEn, s.quoteMr), ui),
    image: s.photoId ? publicMediaUrl(slug, s.photoId) : undefined,
    href: detailHref(slug, "success-stories", s.id),
  }));
  const livePages = new Set(live.map((s) => s.pageKey));
  for (const page of STORY_PAGES) {
    if (livePages.has(page)) continue;
    const section = FALLBACK_SECTIONS[page]?.find((s) => s.sectionKey === "success-stories");
    const items = (section?.data.items as { title?: Bilingual; description?: Bilingual; imageId?: string }[] | undefined) ?? [];
    for (const it of items) cards.push({ title: pickText(it.title, ui), text: pickText(it.description, ui), image: mediaUrl(slug, it.imageId) });
  }

  return (
    <main>
      <DetailHero eyebrow={tp("culture")} title={t("allStoriesTitle")} back={{ href: `/${slug}/culture`, label: td("back", { page: tp("culture") }) }} />
      <section className="bg-cream pb-14">
        <ul className="mx-auto grid max-w-[1440px] grid-cols-2 gap-3 px-4 sm:gap-5 sm:px-8 lg:grid-cols-4 lg:px-[60px]">
          {cards.map((c, i) => (
            <li key={i} className="flex flex-col overflow-hidden rounded-[10px] border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.06)]">
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={c.image} alt="" loading="lazy" className="h-[110px] w-full object-cover sm:h-[180px]" />
              )}
              <div className="flex flex-1 flex-col px-3 pt-3 pb-4 sm:px-5 sm:pt-4 sm:pb-5">
                <p className="text-[14px] leading-5 font-semibold text-black sm:text-[16px] sm:leading-6">{c.title}</p>
                {c.text && <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-5 text-[#414141] sm:mt-2 sm:text-[14px] sm:leading-6">{c.text}</p>}
                <div className="mt-auto pt-3 sm:pt-4">
                  {c.href ? (
                    <Link href={c.href} className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#135130] hover:underline">
                      {td("readStory")} <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  ) : (
                    <StoryDialog
                      label={td("readStory")}
                      title={c.title}
                      text={c.text}
                      image={c.image}
                      closeLabel={tc("close")}
                      className="inline-flex cursor-pointer items-center gap-2 text-[14px] font-semibold text-[#135130] hover:underline"
                    >
                      <ArrowRight className="size-4" aria-hidden />
                    </StoryDialog>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
