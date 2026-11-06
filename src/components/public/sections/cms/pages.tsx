import { ArrowRight, Download, Play } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { detailHref } from "@/lib/href";
import { pair, pickText } from "@/i18n/text";
import { listPublicAnnouncements, publicMediaUrl } from "@/lib/api/public";
import { CalendarCard, type CalendarEvent } from "../CalendarCard";
import { CategoryFilteredList, UnfilteredList } from "../KitClient";
import { categoryHref, liveAnnouncementCategories, liveCalendarEvents, liveDownloads } from "../PageKit4";
import type { SectionProps } from "../index";
import { PhotoGalleryClient, ThenNowClient } from "./client";
import { Band, Icon, cardClass, externalProps, list, mediaUrl, plain, tx, videoEmbedUrl, type B } from "./kit";
import { MiniDocumentaryClient } from "./MiniDocumentary";

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);

// ------------------------------------------------------------------------------------ Announcements

/**
 * `announcement-categories`: category tiles under the banner. Each tile shows how many live announcements it has
 * (GET /public/:slug/announcements/categories, matched on the English or Marathi label) and filters the list.
 */
export async function AnnouncementCategoriesSection({ slug, locale, data }: SectionProps) {
  const td = await getTranslations("public.detail");
  const items = list<{ label?: B; icon?: string }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  const counts = await liveAnnouncementCategories(slug);
  const match = (c: { label?: B }) => counts.find((x) => [tx(c.label, "en"), tx(c.label, "mr")].some((l) => l && l.toLowerCase() === x.category.toLowerCase()));
  return (
    <Band tone="cream">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((c, i) => {
          const hit = match(c);
          return (
            <li key={i}>
              <Link href={categoryHref(slug, hit?.category ?? tx(c.label, "en"))} className={`${cardClass} flex h-full flex-col items-center text-center !p-4 hover:border-[#135130]/40`}>
                <span className="flex size-11 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name={c.icon ?? "megaphone"} />
                </span>
                <span className="mt-2 text-[13px] font-semibold text-black">{tx(c.label, locale)}</span>
                <span className="text-[12px] text-[#414141]">{td("announcementCount", { n: hit?.count ?? 0 })}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `live-announcements`: the website's real published announcements (from the announcements module). */
export async function LiveAnnouncementsSection({ slug, locale }: SectionProps) {
  const t = await getTranslations("public");
  const tc = await getTranslations("public.cms");
  const td = await getTranslations("public.detail");
  // Up to 100 rows so the `?category=` filter (category tiles) works on the whole recent list; 8 are shown unfiltered.
  const live = await listPublicAnnouncements(slug, { limit: 100 }).catch(() => null);
  const rows = live?.data ?? [];
  if (rows.length === 0) return null;
  const fmt = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
  const listClass = "divide-y divide-black/10";
  const nodes = rows.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3">
            <Link href={detailHref(slug, "announcements", a.id)} className="min-w-0 flex-1 hover:underline">
              <span className="block text-[14px] font-semibold text-black">{pickText(pair(a.titleEn, a.titleMr), locale)}</span>
              {pickText(pair(a.bodyEn, a.bodyMr), locale) && <span className="block truncate text-[12px] text-[#414141]">{pickText(pair(a.bodyEn, a.bodyMr), locale)}</span>}
            </Link>
            {a.publishedAt && <span className="shrink-0 text-[12px] text-[#414141]">{fmt.format(new Date(a.publishedAt))}</span>}
            {a.attachmentId && (
              <a href={publicMediaUrl(slug, a.attachmentId)} download aria-label={t("downloadAttachment")} className="text-[#135130]">
                <Download className="size-4" aria-hidden />
              </a>
            )}
          </li>
  ));
  return (
    <div className={cardClass}>
      <h2 className="mb-2 text-[18px] font-semibold text-black">{tc("latestAnnouncements")}</h2>
      <Suspense
        fallback={
          <UnfilteredList limit={8} listClassName={listClass}>
            {nodes}
          </UnfilteredList>
        }
      >
        <CategoryFilteredList
          categories={rows.map((a) => a.category)}
          limit={8}
          listClassName={listClass}
          emptyClassName="px-5 py-6 text-center text-[13px] text-[#414141]"
          emptyLabel={td("noInCategory")}
          filteredByLabel={td.raw("filteredBy") as string}
          showAllLabel={td("showAll")}
        >
          {nodes}
        </CategoryFilteredList>
      </Suspense>
    </div>
  );
}

/** `calendar`: month calendar with the events the GP entered. */
export async function CalendarSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { title?: B; defaultMonthView?: "current" | "custom"; defaultMonth?: string; eventsToShow?: number; visible?: boolean; events?: unknown };
  if (d.visible === false) return null;
  const events: CalendarEvent[] = list<{ date: string; title?: B; colour?: string; startTime?: string; endTime?: string }>(d.events).map((e) => ({
    date: e.date,
    title: tx(e.title, locale),
    color: e.colour,
    time: [e.startTime, e.endTime].filter(Boolean).join(" – ") || undefined,
  }));
  // Events of published announcements (eventStartAt / eventLocation) join the ones typed into the section.
  events.push(...(await liveCalendarEvents(slug, locale)));
  const weekdays = locale === "mr" ? ["र", "सो", "मं", "बु", "गु", "शु", "श"] : ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "long" }).format(new Date(2026, m, 1)));
  const initial = d.defaultMonthView === "custom" && d.defaultMonth ? `${d.defaultMonth}-01T00:00:00` : new Date().toISOString();
  return (
    <CalendarCard title={tx(d.title, locale)} initial={initial} events={events} weekdays={weekdays} monthNames={monthNames} allLabel={t("viewFullCalendar")} emptyLabel={t("noEvents")} />
  );
}

/** `deadline-cards`: important dates. */
export async function DeadlineCardsSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ icon?: string; date?: string; title?: B; subtitle?: B }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <div className={cardClass}>
      <h2 className="mb-3 text-[18px] font-semibold text-black">{t("deadlines")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((c, i) => (
          <li key={i} className="rounded-[10px] bg-[#fcf7ee] p-4 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#f5871f]/15 text-[#c25f00]">
              <Icon name={c.icon ?? "calendar"} />
            </span>
            <p className="mt-2 text-[13px] font-semibold text-[#c25f00]">{plain(c.date, locale)}</p>
            <p className="text-[14px] font-semibold text-black">{tx(c.title, locale)}</p>
            {tx(c.subtitle, locale) && <p className="text-[12px] text-[#414141]">{tx(c.subtitle, locale)}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** `download-forms`: forms and circulars to download. */
export async function DownloadFormsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const typed = list<{ icon?: string; name?: B; description?: B; fileId?: string }>((data as { items?: unknown }).items).filter((f) => f.fileId);
  // Files attached to published announcements follow the forms typed into the section (type and size as caption).
  const live = (await liveDownloads(slug, locale)).filter((f) => !typed.some((x) => x.fileId === f.fileId));
  const items = [...typed, ...live.map((f) => ({ icon: "file", name: { en: f.name, mr: f.name } as B, description: { en: [f.type, f.size].filter(Boolean).join(" • ") } as B, fileId: f.fileId }))];
  if (items.length === 0) return null;
  return (
    <div className={cardClass}>
      <h2 className="mb-3 text-[18px] font-semibold text-black">{t("downloads")}</h2>
      <ul className="space-y-2">
        {items.map((f, i) => (
          <li key={i} className="flex items-center gap-3 rounded-[8px] border border-black/10 px-3 py-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
              <Icon name={f.icon ?? "file"} className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-black">{tx(f.name, locale)}</span>
              {tx(f.description, locale) && <span className="block truncate text-[11px] text-[#414141]">{tx(f.description, locale)}</span>}
            </span>
            <a href={mediaUrl(slug, f.fileId)} download aria-label={t("download")} className="text-[#135130] hover:opacity-70">
              <Download className="size-5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/// ------------------------------------------------------------------------------------ Gallery

/** Centred 30px gallery section heading (Figma, Title Case). */
function GalleryBand({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        {heading && <h2 className="mb-10 text-center text-[36px] leading-[45px] font-semibold text-black">{heading}</h2>}
        {children}
      </div>
    </section>
  );
}

/** `photo-gallery`: category pills and a paged four-photo carousel. */
export async function PhotoGallerySection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { categories?: unknown; photos?: unknown };
  const categories = list<{ key?: string; name?: B; order?: number }>(d.categories).sort(byOrder).map((c) => ({ key: c.key ?? "", name: tx(c.name, locale) }));
  const photos = list<{ imageId?: string; title?: B; categoryKey?: string; date?: string; order?: number }>(d.photos)
    .sort(byOrder)
    .filter((p) => p.imageId)
    .map((p) => ({ src: mediaUrl(slug, p.imageId!) ?? "", title: tx(p.title, locale), category: p.categoryKey ?? "", date: p.date ? longDate(locale, p.date) : undefined }));
  if (photos.length === 0) return null;
  return (
    <GalleryBand heading={t("photoGalleryTitle")}>
      <PhotoGalleryClient categories={categories} photos={photos} allLabel={t("all")} pageLabel={t.raw("galleryPage") as string} />
    </GalleryBand>
  );
}

/** `video-gallery`: video cards (thumbnail, play badge, length, title, date) that open the YouTube / Vimeo video. */
export async function VideoGallerySection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ thumbnailId?: string; title?: B; videoUrl?: string; date?: string; duration?: string; order?: number }>((data as { items?: unknown }).items)
    .sort(byOrder)
    .filter((v) => v.videoUrl);
  if (items.length === 0) return null;
  return (
    <GalleryBand heading={t("videoGalleryTitle")}>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((v, i) => {
          const thumb = mediaUrl(slug, v.thumbnailId);
          return (
            <li key={i}>
              <a href={v.videoUrl} {...externalProps} className="group block overflow-hidden rounded-[10px] bg-white">
                <span className="relative block">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                    <img src={thumb} alt="" loading="lazy" className="h-[193px] w-full rounded-[10px] object-cover" />
                  ) : (
                    <span className="block h-[193px] rounded-[10px] bg-black/80" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-10 items-center justify-center rounded-full bg-black/60 text-white transition group-hover:scale-105">
                      <Play className="size-4" fill="currentColor" aria-hidden />
                    </span>
                  </span>
                  {v.duration && <span className="absolute right-4 bottom-3 rounded-[3px] bg-black/75 px-1.5 py-0.5 text-[11px] text-white">{v.duration}</span>}
                </span>
                <span className="block px-4 py-4">
                  <span className="block text-[16px] text-black">{tx(v.title, locale)}</span>
                  {v.date && <span className="mt-1 block text-[12px] text-[#414141]">{longDate(locale, v.date)}</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </GalleryBand>
  );
}

/** `press-coverage`: article cards (logo, headline, date, link). */
export async function PressCoverageSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ logoId?: string; mediaName?: string; title?: B; date?: string; url?: string; order?: number }>((data as { items?: unknown }).items).sort(byOrder).filter((p) => p.url);
  if (items.length === 0) return null;
  return (
    <GalleryBand heading={t("pressTitle")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {items.map((p, i) => {
          const logo = mediaUrl(slug, p.logoId);
          return (
            <li key={i} className={`${cardClass} flex flex-col`}>
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={logo} alt={p.mediaName ?? ""} loading="lazy" className="h-12 w-auto max-w-full self-start object-contain" />
              ) : (
                <span className="text-[16px] font-bold text-[#135130]">{p.mediaName}</span>
              )}
              <p className="mt-3 text-[14px] leading-5 font-medium text-black">{tx(p.title, locale)}</p>
              {p.date && (
                <p className="mt-2.5 text-[11.5px] text-[#414141]">
                  {new Date(`${p.date}T00:00:00`).toLocaleDateString(locale === "mr" ? "mr-IN" : "en-US", { day: "numeric", month: "long", year: "numeric" })}
                  <span className="mx-2 text-black/60">|</span>
                  {t("pressNews")}
                </p>
              )}
              <a href={p.url} {...externalProps} className="mt-auto inline-flex items-center gap-2 pt-3.5 text-[12px] font-semibold text-[#135130] hover:underline">
                {t("readMoreCaps")} <ArrowRight className="size-3.5" aria-hidden />
              </a>
            </li>
          );
        })}
      </ul>
    </GalleryBand>
  );
}

/** `then-and-now`: full-width before/after slider (Figma: 354px tall, labels at the bottom). */
export async function ThenAndNowSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { heading?: B; comparisons?: unknown };
  const comparisons = list<{ beforeImageId?: string; afterImageId?: string; heading?: B; order?: number }>(d.comparisons)
    .sort(byOrder)
    .filter((c) => c.beforeImageId && c.afterImageId)
    .map((c) => ({ before: mediaUrl(slug, c.beforeImageId!) ?? "", after: mediaUrl(slug, c.afterImageId!) ?? "", heading: tx(c.heading, locale) }));
  if (comparisons.length === 0) return null;
  return (
    <GalleryBand heading={tx(d.heading, locale)}>
      <ThenNowClient wide comparisons={comparisons} beforeLabel={t("before")} afterLabel={t("after")} />
    </GalleryBand>
  );
}

/** YouTube video id of a link, for its thumbnail picture. */
function youTubeId(url: string | undefined): string | null {
  const embed = videoEmbedUrl(url);
  const m = embed && /youtube-nocookie\.com\/embed\/([\w-]{6,})/.exec(embed);
  return m ? m[1]! : null;
}

/**
 * `mini-documentary`: thumbnail with title and duration over it, details and "Watch Documentary".
 * Play shows the uploaded video or the YouTube / Vimeo player in place; a link that cannot be embedded
 * opens in a new tab. `thumbnailUrl` and `duration` are placeholder-only (the backend section has
 * neither; a YouTube link gets its own thumbnail).
 */
export async function MiniDocumentarySection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as {
    heading?: B;
    title?: B;
    description?: B;
    source?: "upload" | "link";
    videoId?: string;
    videoUrl?: string;
    publishedDate?: string;
    playback?: { autoplay?: boolean; controls?: boolean; muted?: boolean; loop?: boolean };
    thumbnailUrl?: string;
    duration?: string;
  };
  const video = d.source === "upload" ? mediaUrl(slug, d.videoId) : undefined;
  if (!video && !(d.source === "link" && d.videoUrl)) return null;
  const yt = youTubeId(d.videoUrl);
  const thumbnail = d.thumbnailUrl ?? (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : undefined);
  return (
    <GalleryBand heading={tx(d.heading, locale)}>
      <MiniDocumentaryClient
        title={tx(d.title, locale)}
        description={tx(d.description, locale)}
        videoSrc={video}
        embedSrc={d.source === "link" ? (videoEmbedUrl(d.videoUrl) ?? undefined) : undefined}
        linkUrl={d.source === "link" ? d.videoUrl : undefined}
        thumbnail={thumbnail}
        duration={d.duration}
        durationText={d.duration ? t("durationLabel", { d: d.duration }) : undefined}
        publishedText={d.publishedDate ? t("published", { date: longDate(locale, d.publishedDate) }) : undefined}
        watchLabel={t("watchDocumentary")}
        playLabel={t("playVideo")}
        playback={{ controls: d.playback?.controls, muted: d.playback?.muted, loop: d.playback?.loop }}
      />
    </GalleryBand>
  );
}

/** "March 25, 2024" style date (Figma gallery captions). */
function longDate(locale: SectionProps["locale"], d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString(locale === "mr" ? "mr-IN" : "en-US", { day: "numeric", month: "long", year: "numeric" });
}
