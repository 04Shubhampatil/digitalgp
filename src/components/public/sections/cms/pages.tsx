import { Download, ExternalLink, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { pair, pickText } from "@/i18n/text";
import { listPublicAnnouncements, publicMediaUrl } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import { CalendarCard, type CalendarEvent } from "../CalendarCard";
import type { SectionProps } from "../index";
import { PhotoGalleryClient, ThenNowClient, YouthPostsClient } from "./client";
import { Band, Icon, LinkButton, VideoEmbed, cardClass, externalProps, list, mediaUrl, tx, type B } from "./kit";

const byOrder = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 0) - (b.order ?? 0);
const dateFmt = (locale: SectionProps["locale"], d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });

// ------------------------------------------------------------------------------------ Our Village

/** `village-intro`: introduction card with icon, text and a button. */
export function VillageIntroSection({ slug, locale, data }: SectionProps) {
  const d = data as { iconId?: string; title?: B; description?: B; buttonLabel?: B; buttonLink?: string };
  const icon = mediaUrl(slug, d.iconId);
  return (
    <Band tone="cream">
      <div className={`${cardClass} flex flex-col items-start gap-4 sm:flex-row sm:items-center`}>
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img src={icon} alt="" className="size-16 shrink-0 object-contain" />
        )}
        <div className="flex-1">
          <h2 className="text-[22px] font-semibold text-black">{tx(d.title, locale)}</h2>
          {tx(d.description, locale) && <p className="mt-1 text-[14px] leading-6 text-[#414141]">{tx(d.description, locale)}</p>}
        </div>
        {d.buttonLink && (
          <LinkButton href={resolveHref(d.buttonLink, slug)} external={/^https?:\/\//.test(d.buttonLink)}>
            {tx(d.buttonLabel, locale) || "→"}
          </LinkButton>
        )}
      </div>
    </Band>
  );
}

function ImageCards({ slug, locale, items }: { slug: string; locale: SectionProps["locale"]; items: { title?: B; description?: B; imageId?: string }[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((c, i) => {
        const img = mediaUrl(slug, c.imageId);
        return (
          <li key={i} className={`${cardClass} overflow-hidden !p-0`}>
            {img && (
              // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
              <img src={img} alt="" loading="lazy" className="h-48 w-full object-cover" />
            )}
            <div className="p-4">
              <p className="text-[15px] font-semibold text-black">{tx(c.title, locale)}</p>
              {tx(c.description, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(c.description, locale)}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** `heritage-cards`: heritage temples. */
export async function HeritageCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ title?: B; description?: B; imageId?: string }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band heading={t("heritage")}>
      <ImageCards slug={slug} locale={locale} items={items} />
    </Band>
  );
}

/** `culture-cards`: culture, tradition and way of life. */
export async function CultureCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { enabled?: boolean; items?: unknown };
  const items = list<{ title?: B; description?: B; imageId?: string }>(d.items);
  if (d.enabled === false || items.length === 0) return null;
  return (
    <Band heading={t("culture")} tone="cream">
      <ImageCards slug={slug} locale={locale} items={items} />
    </Band>
  );
}

/** `homestay`: text, feature list and photo. */
export function HomestaySection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; description?: B; buttonLabel?: B; buttonLink?: string; imageId?: string; features?: unknown };
  const img = mediaUrl(slug, d.imageId);
  const features = list<{ icon?: string; title?: B }>(d.features);
  return (
    <Band>
      <div className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-[26px] font-semibold text-black">{tx(d.heading, locale)}</h2>
          {tx(d.description, locale) && <p className="mt-2 text-[14px] leading-6 text-[#414141]">{tx(d.description, locale)}</p>}
          {features.length > 0 && (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-[13px] font-medium text-black">
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                    <Icon name={f.icon} className="size-5" />
                  </span>
                  {tx(f.title, locale)}
                </li>
              ))}
            </ul>
          )}
          {d.buttonLink && (
            <div className="mt-6">
              <LinkButton href={resolveHref(d.buttonLink, slug)} external={/^https?:\/\//.test(d.buttonLink)}>
                {tx(d.buttonLabel, locale) || "→"}
              </LinkButton>
            </div>
          )}
        </div>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img src={img} alt="" loading="lazy" className="w-full rounded-[10px] object-cover" />
        )}
      </div>
    </Band>
  );
}

/** `leader-cards`: local leaders with photo, designation and a line about them. */
export async function LeaderCardsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ photoId?: string; name?: B; designation?: B; description?: B }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band heading={t("leaders")} tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((p, i) => {
          const photo = mediaUrl(slug, p.photoId);
          return (
            <li key={i} className={`${cardClass} text-center`}>
              {photo && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={photo} alt="" loading="lazy" className="mx-auto size-28 rounded-full object-cover" />
              )}
              <p className="mt-3 text-[15px] font-semibold text-black">{tx(p.name, locale)}</p>
              {tx(p.designation, locale) && <p className="text-[12px] font-medium text-[#135130]">{tx(p.designation, locale)}</p>}
              {tx(p.description, locale) && <p className="mt-2 text-[12px] leading-5 text-[#414141]">{tx(p.description, locale)}</p>}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `fpo-gallery-voice`: farmer producer organisation, virtual gallery and the voice-of-the-village video. */
export function FpoGalleryVoiceSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    enabled?: boolean;
    fpo?: { iconId?: string; title?: B; description?: B; points?: unknown };
    gallery?: { title?: B; description?: B; imageIds?: unknown };
    voice?: { title?: B; description?: B; videoId?: string; videoUrl?: string };
  };
  if (d.enabled === false) return null;
  const fpoIcon = mediaUrl(slug, d.fpo?.iconId);
  const points = list<B>(d.fpo?.points).filter((p) => tx(p, locale));
  const images = list<string>(d.gallery?.imageIds).filter(Boolean);
  const video = mediaUrl(slug, d.voice?.videoId);
  return (
    <Band tone="white">
      <div className="grid gap-5 lg:grid-cols-3">
        {tx(d.fpo?.title, locale) && (
          <div className={cardClass}>
            {fpoIcon && (
              // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
              <img src={fpoIcon} alt="" className="size-14 object-contain" />
            )}
            <h3 className="mt-2 text-[18px] font-semibold text-black">{tx(d.fpo?.title, locale)}</h3>
            {tx(d.fpo?.description, locale) && <p className="mt-1 text-[13px] leading-5 text-[#414141]">{tx(d.fpo?.description, locale)}</p>}
            {points.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-[13px] text-black">
                {points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#135130]" />
                    {tx(p, locale)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {(images.length > 0 || tx(d.gallery?.title, locale)) && (
          <div className={cardClass}>
            <h3 className="text-[18px] font-semibold text-black">{tx(d.gallery?.title, locale)}</h3>
            {tx(d.gallery?.description, locale) && <p className="mt-1 text-[13px] text-[#414141]">{tx(d.gallery?.description, locale)}</p>}
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {images.slice(0, 9).map((id) => (
                <li key={id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
                  <img src={publicMediaUrl(slug, id)} alt="" loading="lazy" className="aspect-square w-full rounded-[6px] object-cover" />
                </li>
              ))}
            </ul>
          </div>
        )}
        {(video || d.voice?.videoUrl) && (
          <div className={cardClass}>
            <h3 className="mb-1 text-[18px] font-semibold text-black">{tx(d.voice?.title, locale)}</h3>
            {tx(d.voice?.description, locale) && <p className="mb-3 text-[13px] text-[#414141]">{tx(d.voice?.description, locale)}</p>}
            {video ? <video src={video} controls preload="metadata" className="aspect-video w-full rounded-[10px] bg-black" /> : <VideoEmbed url={d.voice?.videoUrl} title={tx(d.voice?.title, locale)} />}
          </div>
        )}
      </div>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ Employment

/** `skill-directory`: skills with how many people offer them (approximate counts are marked). */
export async function SkillDirectorySection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ icon?: string; skillName?: B; availableCount?: number; countIsApproximate?: boolean; link?: string; active?: boolean }>((data as { items?: unknown }).items).filter((s) => s.active !== false);
  if (items.length === 0) return null;
  return (
    <Band heading={t("skillDirectory")} subheading={t("skillDirectorySub")}>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s, i) => {
          const inner = (
            <>
              <span className="flex size-11 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                <Icon name={s.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-black">{tx(s.skillName, locale)}</span>
                {typeof s.availableCount === "number" && (
                  <span className="block text-[12px] text-[#414141]">
                    {s.countIsApproximate ? t("approx", { n: s.availableCount }) : t("available", { n: s.availableCount })}
                  </span>
                )}
              </span>
            </>
          );
          return (
            <li key={i}>
              {s.link ? (
                <Link href={resolveHref(s.link, slug)} className={`${cardClass} flex items-center gap-3 hover:shadow-md`}>
                  {inner}
                </Link>
              ) : (
                <div className={`${cardClass} flex items-center gap-3`}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `job-portals`: government job portals with logo and an external link. */
export async function JobPortalsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ logoId?: string; name?: B; description?: B; websiteUrl?: string; order?: number; active?: boolean }>((data as { items?: unknown }).items)
    .filter((p) => p.active !== false)
    .sort(byOrder);
  if (items.length === 0) return null;
  return (
    <Band heading={t("jobPortals")} tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => {
          const logo = mediaUrl(slug, p.logoId);
          return (
            <li key={i} className={`${cardClass} flex items-start gap-4`}>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                <img src={logo} alt="" loading="lazy" className="size-14 shrink-0 object-contain" />
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-black">{tx(p.name, locale)}</p>
                {tx(p.description, locale) && <p className="mt-1 text-[12px] leading-5 text-[#414141]">{tx(p.description, locale)}</p>}
                {p.websiteUrl && (
                  <a href={p.websiteUrl} {...externalProps} className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#135130] hover:underline">
                    {t("visitSite")} <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

// ------------------------------------------------------------------------------------ Education

/**
 * `student-spotlight`: an identifiable child. Never shown unless the guardian's consent is recorded as
 * confirmed (the backend also requires it before the section can be submitted for review).
 */
export function StudentSpotlightSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    photoId?: string;
    name?: B;
    classAndSchool?: B;
    achievements?: B;
    quote?: B;
    buttonText?: B;
    buttonLink?: string;
    achievementCards?: unknown;
    guardianConsent?: { confirmed?: boolean };
  };
  if (d.guardianConsent?.confirmed !== true) return null;
  const photo = mediaUrl(slug, d.photoId);
  const cards = list<{ icon?: string; title?: B; value?: string }>(d.achievementCards);
  return (
    <Band tone="cream">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
          <img src={photo} alt={tx(d.name, locale)} loading="lazy" className="mx-auto max-h-80 w-auto rounded-[10px] object-cover" />
        )}
        <div>
          <h2 className="text-[24px] font-semibold text-black">{tx(d.name, locale)}</h2>
          {tx(d.classAndSchool, locale) && <p className="text-[13px] font-medium text-[#135130]">{tx(d.classAndSchool, locale)}</p>}
          {tx(d.achievements, locale) && <p className="mt-3 text-[14px] leading-6 text-black">{tx(d.achievements, locale)}</p>}
          {tx(d.quote, locale) && <blockquote className="mt-3 border-l-4 border-[#135130] pl-3 text-[14px] text-[#414141] italic">{tx(d.quote, locale)}</blockquote>}
          {d.buttonLink && (
            <div className="mt-4">
              <LinkButton href={resolveHref(d.buttonLink, slug)} external={/^https?:\/\//.test(d.buttonLink)}>
                {tx(d.buttonText, locale) || "→"}
              </LinkButton>
            </div>
          )}
        </div>
        {cards.length > 0 && (
          <ul className="space-y-3">
            {cards.map((c, i) => (
              <li key={i} className={`${cardClass} flex items-center gap-3 !p-3`}>
                <span className="flex size-10 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
                  <Icon name={c.icon} className="size-5" />
                </span>
                <span className="flex-1 text-[12px] text-[#414141]">{tx(c.title, locale)}</span>
                <span className="text-[14px] font-semibold text-black">{c.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Band>
  );
}

/** `youth-speak-tabs`: nothing on its own; the tabs are shown together with `youth-posts`. */
export function YouthSpeakTabsSection() {
  return null;
}

/** `youth-posts`: tabbed blog / video / reel / idea cards using the tabs from `youth-speak-tabs`. */
export async function YouthPostsSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public.cms");
  const tabs = list<{ tabKey?: string; name?: B; active?: boolean }>((siblings?.["youth-speak-tabs"] as { items?: unknown } | undefined)?.items)
    .filter((x) => x.active !== false && x.tabKey)
    .map((x) => ({ key: x.tabKey!, name: tx(x.name, locale) }));
  const posts = list<{ tabKey?: string; type?: "blog" | "youtube" | "reel" | "idea"; title?: B; coverImageId?: string; url?: string }>((data as { items?: unknown }).items).map((p) => ({
    tab: p.tabKey ?? "",
    type: p.type ?? "blog",
    typeLabel: t(`post_${p.type ?? "blog"}`),
    title: tx(p.title, locale),
    cover: mediaUrl(slug, p.coverImageId),
    url: p.url,
  }));
  if (posts.length === 0) return null;
  return (
    <Band heading={t("youthSpeak")}>
      <YouthPostsClient tabs={tabs} posts={posts} allLabel={t("all")} openLabel={t("open")} />
    </Band>
  );
}

// ------------------------------------------------------------------------------------ Announcements

/** `announcement-categories`: category tiles under the banner. */
export function AnnouncementCategoriesSection({ locale, data }: SectionProps) {
  const items = list<{ label?: B; icon?: string }>((data as { items?: unknown }).items);
  if (items.length === 0) return null;
  return (
    <Band tone="cream">
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((c, i) => (
          <li key={i} className={`${cardClass} flex flex-col items-center text-center !p-4`}>
            <span className="flex size-11 items-center justify-center rounded-full bg-[#135130]/10 text-[#135130]">
              <Icon name={c.icon ?? "megaphone"} />
            </span>
            <span className="mt-2 text-[13px] font-semibold text-black">{tx(c.label, locale)}</span>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** `live-announcements`: the website's real published announcements (from the announcements module). */
export async function LiveAnnouncementsSection({ slug, locale }: SectionProps) {
  const t = await getTranslations("public");
  const tc = await getTranslations("public.cms");
  const live = await listPublicAnnouncements(slug, { limit: 8 }).catch(() => null);
  const rows = live?.data ?? [];
  if (rows.length === 0) return null;
  const fmt = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className={cardClass}>
      <h2 className="mb-2 text-[18px] font-semibold text-black">{tc("latestAnnouncements")}</h2>
      <ul className="divide-y divide-black/10">
        {rows.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-black">{pickText(pair(a.titleEn, a.titleMr), locale)}</span>
              {pickText(pair(a.bodyEn, a.bodyMr), locale) && <span className="block truncate text-[12px] text-[#414141]">{pickText(pair(a.bodyEn, a.bodyMr), locale)}</span>}
            </span>
            {a.publishedAt && <span className="shrink-0 text-[12px] text-[#414141]">{fmt.format(new Date(a.publishedAt))}</span>}
            {a.attachmentId && (
              <a href={publicMediaUrl(slug, a.attachmentId)} download aria-label={t("downloadAttachment")} className="text-[#135130]">
                <Download className="size-4" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** `calendar`: month calendar with the events the GP entered. */
export async function CalendarSection({ locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { title?: B; defaultMonthView?: "current" | "custom"; defaultMonth?: string; eventsToShow?: number; visible?: boolean; events?: unknown };
  if (d.visible === false) return null;
  const events: CalendarEvent[] = list<{ date: string; title?: B; colour?: string; startTime?: string; endTime?: string }>(d.events).map((e) => ({
    date: e.date,
    title: tx(e.title, locale),
    color: e.colour,
    time: [e.startTime, e.endTime].filter(Boolean).join(" – ") || undefined,
  }));
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
            <p className="mt-2 text-[13px] font-semibold text-[#c25f00]">{c.date}</p>
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
  const items = list<{ icon?: string; name?: B; description?: B; fileId?: string }>((data as { items?: unknown }).items).filter((f) => f.fileId);
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

// ------------------------------------------------------------------------------------ Gallery

/** `photo-gallery`: photos with category filters. */
export async function PhotoGallerySection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const d = data as { categories?: unknown; photos?: unknown };
  const categories = list<{ key?: string; name?: B; order?: number }>(d.categories).sort(byOrder).map((c) => ({ key: c.key ?? "", name: tx(c.name, locale) }));
  const photos = list<{ imageId?: string; title?: B; categoryKey?: string; date?: string; order?: number }>(d.photos)
    .sort(byOrder)
    .filter((p) => p.imageId)
    .map((p) => ({ src: publicMediaUrl(slug, p.imageId!), title: tx(p.title, locale), category: p.categoryKey ?? "", date: p.date ? dateFmt(locale, p.date) : undefined }));
  if (photos.length === 0) return null;
  return (
    <Band heading={t("photoGallery")}>
      <PhotoGalleryClient categories={categories} photos={photos} allLabel={t("all")} />
    </Band>
  );
}

/** `video-gallery`: video cards (thumbnail, title, length) that open the YouTube / Vimeo video. */
export async function VideoGallerySection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ thumbnailId?: string; title?: B; videoUrl?: string; date?: string; duration?: string; order?: number }>((data as { items?: unknown }).items)
    .sort(byOrder)
    .filter((v) => v.videoUrl);
  if (items.length === 0) return null;
  return (
    <Band heading={t("videoGallery")} tone="cream">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((v, i) => {
          const thumb = mediaUrl(slug, v.thumbnailId);
          return (
            <li key={i}>
              <a href={v.videoUrl} {...externalProps} className={`${cardClass} block overflow-hidden !p-0 hover:shadow-md`}>
                <span className="relative block">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
                    <img src={thumb} alt="" loading="lazy" className="h-40 w-full object-cover" />
                  ) : (
                    <span className="block h-40 bg-black/80" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-[#135130]">
                      <Play className="size-6" aria-hidden />
                    </span>
                  </span>
                  {v.duration && <span className="absolute right-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">{v.duration}</span>}
                </span>
                <span className="block p-3">
                  <span className="block text-[13px] font-semibold text-black">{tx(v.title, locale)}</span>
                  {v.date && <span className="block text-[11px] text-[#414141]">{dateFmt(locale, v.date)}</span>}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `press-coverage`: article cards (logo, headline, date, link). */
export async function PressCoverageSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.cms");
  const items = list<{ logoId?: string; mediaName?: string; title?: B; date?: string; url?: string; order?: number }>((data as { items?: unknown }).items).sort(byOrder).filter((p) => p.url);
  if (items.length === 0) return null;
  return (
    <Band heading={t("pressCoverage")}>
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
              {p.date && <p className="mt-2 text-[11px] text-[#414141]">{dateFmt(locale, p.date)}</p>}
              <a href={p.url} {...externalProps} className="mt-auto inline-flex items-center gap-1 pt-3 text-[12px] font-semibold text-[#135130] hover:underline">
                {t("readMore")} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}

/** `then-and-now`: before/after slider for each comparison. */
export async function ThenAndNowSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { heading?: B; comparisons?: unknown };
  const comparisons = list<{ beforeImageId?: string; afterImageId?: string; heading?: B; order?: number }>(d.comparisons)
    .sort(byOrder)
    .filter((c) => c.beforeImageId && c.afterImageId)
    .map((c) => ({ before: publicMediaUrl(slug, c.beforeImageId!), after: publicMediaUrl(slug, c.afterImageId!), heading: tx(c.heading, locale) }));
  if (comparisons.length === 0) return null;
  return (
    <Band heading={tx(d.heading, locale)} tone="cream">
      <ThenNowClient comparisons={comparisons} beforeLabel={t("before")} afterLabel={t("after")} />
    </Band>
  );
}

/** `mini-documentary`: an uploaded video or a YouTube / Vimeo embed. */
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
  };
  const video = d.source === "upload" ? mediaUrl(slug, d.videoId) : undefined;
  if (!video && d.source !== "link") return null;
  const p = d.playback ?? {};
  return (
    <Band heading={tx(d.heading, locale)}>
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {video ? (
          <video src={video} controls={p.controls !== false} autoPlay={p.autoplay} muted={p.muted || p.autoplay} loop={p.loop} playsInline preload="metadata" className="aspect-video w-full rounded-[10px] bg-black" />
        ) : (
          <VideoEmbed url={d.videoUrl} title={tx(d.title, locale)} />
        )}
        <div>
          <h3 className="text-[22px] font-semibold text-black">{tx(d.title, locale)}</h3>
          {tx(d.description, locale) && <p className="mt-3 text-[14px] leading-6 text-[#414141]">{tx(d.description, locale)}</p>}
          {d.publishedDate && <p className="mt-3 text-[12px] text-[#414141]">{t("published", { date: dateFmt(locale, d.publishedDate) })}</p>}
        </div>
      </div>
    </Band>
  );
}
