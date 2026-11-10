import { marathiFor } from "@/i18n/mr-fallback";
import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  BriefcaseBusiness,
  CircleHelp,
  FileText,
  Flag,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  House,
  IdCard,
  Mail,
  Megaphone,
  MessageSquareText,
  Phone,
  ScrollText,
  SearchCheck,
  Settings,
  ShieldCheck,
  Sprout,
  UserRound,
  Users,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pageHref } from "@/config/public-nav";
import type { PublicAnnouncementCategoryDto } from "@/types/api";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import {
  listPublicAnnouncementCategories,
  listPublicAnnouncements,
  publicMediaUrl,
} from "@/lib/api/public";
import { detailHref, resolveHref } from "@/lib/href";
import { CalendarCard, type CalendarEvent } from "./CalendarCard";
import { CategoryFilteredList, UnfilteredList } from "./KitClient";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;
interface Btn {
  label?: B;
  href?: string;
}

/* ------------------------------------------------------------------ Announcements & Circulars */

/** Link that filters the live announcement list of the announcements page by category. */
export function categoryHref(slug: string, category: string): string {
  return `${pageHref(slug, "announcements")}?category=${encodeURIComponent(category)}#live-announcements`;
}

/** Categories of the live announcements with their counts (GET /public/:slug/announcements/categories); [] when unavailable. */
export async function liveAnnouncementCategories(
  slug: string,
): Promise<PublicAnnouncementCategoryDto[]> {
  return (await listPublicAnnouncementCategories(slug).catch(() => null)) ?? [];
}

const EVENT_COLOURS = ["#135130", "#f5871f", "#1a62e0", "#6a1b9a", "#e8202a"];
const IST_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const isoDay = (d: Date) => IST_DAY.format(d);

/**
 * Calendar events from published announcements (GET /public/:slug/announcements?events=true&from&to): about six months
 * back and six months ahead, each linking to its announcement page.
 */
export async function liveCalendarEvents(
  slug: string,
  locale: SectionProps["locale"],
): Promise<CalendarEvent[]> {
  const now = Date.now();
  const res = await listPublicAnnouncements(slug, {
    events: "true",
    from: isoDay(new Date(now - 180 * 864e5)),
    to: isoDay(new Date(now + 200 * 864e5)),
    limit: 100,
  }).catch(() => null);
  const time = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
  });
  return (res?.data ?? [])
    .filter((a) => a.eventStartAt)
    .map((a, i) => ({
      date: isoDay(new Date(a.eventStartAt!)),
      title: pickText(pair(a.titleEn, a.titleMr), locale),
      time: mrTimeFor(
        locale,
        [time.format(new Date(a.eventStartAt!)), a.eventEndAt ? time.format(new Date(a.eventEndAt)) : ""].filter(Boolean).join(" – "),
      ),
      color: EVENT_COLOURS[i % EVENT_COLOURS.length],
      location:
        pickText(pair(a.eventLocationEn, a.eventLocationMr), locale) ||
        undefined,
      href: detailHref(slug, "announcements", a.id),
    }));
}

/** Downloads: published announcements that carry a file (GET /public/:slug/announcements?hasAttachment=true). */
export async function liveDownloads(
  slug: string,
  locale: SectionProps["locale"],
) {
  const res = await listPublicAnnouncements(slug, {
    hasAttachment: "true",
    limit: 20,
  }).catch(() => null);
  return (res?.data ?? [])
    .filter((a) => a.attachment)
    .map((a) => {
      const f = a.attachment!;
      const ext = f.name.includes(".")
        ? f.name.split(".").pop()!.toUpperCase()
        : (f.mimeType.split("/").pop() ?? "").toUpperCase();
      return {
        fileId: f.id,
        name: pickText(pair(a.titleEn, a.titleMr), locale) || f.name,
        type: ext,
        size: formatBytes(f.sizeBytes),
      };
    });
}

/** "125 KB", "1.2 MB". */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Figma pictures of the six category tiles (community, welfare, transfer, bills, jobs, events). */
const CAT_PICTURES = Array.from({ length: 6 }, (_, i) => `/images/figma/pages/ann-cat-${i + 1}.png`);
/** A published category picks the picture whose theme its name mentions; any other category takes the next free one. */
const CAT_THEMES: [RegExp, number][] = [
  [/communit|समुदा/i, 0],
  [/welfare|scheme|कल्याण|योजन/i, 1],
  [/transfer|बदली/i, 2],
  [/bill|tax|बिल/i, 3],
  [/job|recruit|vacanc|भरती|नोकर|रोजगार/i, 4],
  [/event|कार्यक्र|उपक्रम/i, 5],
];

/** "10:00 AM - 12:00 PM" or "१०:०० AM – १:०० PM" → "सकाळी १०:०० - दुपारी १२:००" (Marathi day-part words). */
const mrTimeFor = (locale: string, t?: string) => (locale === "mr" ? mrTime(t) : t);
function mrTime(t?: string) {
  if (!t) return t;
  const DEV = "०१२३४५६७८९";
  const dev = (n: string) => n.replace(/\d/g, (c) => DEV[Number(c)] ?? c);
  const latin = (n: string) => n.replace(/[०-९]/g, (c) => String(DEV.indexOf(c)));
  return t.replace(/([\d०-९]{1,2}:[\d०-९]{2})\s*(AM|PM)/gi, (_m: string, hm: string, ap: string) => {
    const h = Number(latin(hm).split(":")[0]);
    const part = ap.toUpperCase() === "AM" ? "सकाळी" : h === 12 || h < 4 ? "दुपारी" : "सायं.";
    return `${part} ${dev(latin(hm))}`;
  });
}

/**
 * `announce-categories`: category shortcuts in one white card overlapping the hero (Figma 1318×178: 220×135 tiles with a 67px
 * picture, 23px label, "View All" line). With published announcements the tiles are the live categories with their counts and
 * filter the list below (?category=…#live-announcements); otherwise the design's labels, which jump to the list.
 */
export async function AnnounceCategoriesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.detail");
  const d = data as { viewAll?: B; href?: string; items?: { label?: B; href?: string }[] };
  const live = await liveAnnouncementCategories(slug);
  const tiles =
    live.length > 0
      ? live.slice(0, 6).map((c) => ({ label: locale === "mr" ? (marathiFor(c.category) ?? c.category) : c.category, caption: t("announcementCount", { n: c.count }), href: categoryHref(slug, c.category) }))
      : (d.items ?? []).map((it) => ({ label: pickText(it.label, locale), caption: pickText(d.viewAll, locale), href: resolveHref(it.href ?? d.href ?? "page:announcements#announce-feed", slug) }));
  const taken = new Set<number>();
  const themed = tiles.map((it) => {
    const k = CAT_THEMES.find(([re, n]) => re.test(it.label) && !taken.has(n))?.[1];
    if (k !== undefined) taken.add(k);
    return k;
  });
  const pictures = themed.map((k, i) => {
    if (k !== undefined) return CAT_PICTURES[k]!;
    const free = [0, 1, 2, 3, 4, 5].find((n) => !taken.has(n)) ?? i % 6;
    taken.add(free);
    return CAT_PICTURES[free]!;
  });
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[110px] lg:px-[60px]">
      <ul className={`grid grid-cols-2 gap-y-4 rounded-[16px] bg-white px-2 py-5 shadow-[0_0_16px_rgba(0,0,0,0.18)] sm:grid-cols-3 lg:px-0 lg:py-[21px] ${tiles.length >= 6 ? "lg:grid-cols-6" : tiles.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {tiles.map((it, i) => (
          <li key={i} className="lg:border-l lg:border-[#414141]/20 lg:first:border-l-0">
            <Link href={it.href} className="group flex flex-col items-center px-2 text-center lg:h-[135px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
              <img src={pictures[i]} alt="" width={67} height={67} className="size-[67px] shrink-0" />
              <span className="max-w-full truncate text-[23px] leading-[31px] font-semibold text-black group-hover:text-[#135130]" title={it.label}>
                {it.label}
              </span>
              <span className="mt-[18px] text-[13.8px] leading-[19px] whitespace-nowrap text-black">{it.caption}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Figma pictures of the five list rows (the design cycles through them). */
const ROW_PICTURES = Array.from({ length: 5 }, (_, i) => `/images/figma/pages/ann-row-${i + 1}.png`);

const pill = "inline-flex h-10 items-center justify-between gap-3 rounded-full border-[0.58px] border-[#135130] bg-white px-4 text-[13.5px] whitespace-nowrap text-[#135130] hover:bg-[#135130]/5";

/**
 * `announce-feed`: latest announcements (published ones when present, each opening its own page, filtered by the
 * `category` query parameter; "View All" lists every one: ?all=1) beside the interactive calendar (published events, else the
 * design's sample events). Figma: 863×616 and 431×616 cards, 24px apart.
 */
export async function AnnounceFeedSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const td = await getTranslations("public.detail");
  const d = data as {
    heading?: B;
    calendarTitle?: B;
    viewAll?: Btn;
    viewAllLong?: B;
    newLabel?: B;
    items?: { title?: B; body?: B; date?: B }[];
    events?: { date: string; title?: B; time?: string; color?: string }[];
  };
  const [live, liveEvents] = await Promise.all([listPublicAnnouncements(slug, { limit: 100 }).catch(() => null), liveCalendarEvents(slug, locale)]);
  // Figma shows "July 5, 2025" in English.
  const fmt = locale === "mr" ? new Intl.DateTimeFormat("mr-IN", { day: "numeric", month: "short", year: "numeric" }) : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
  const rows =
    live && live.data.length > 0
      ? live.data.map((a) => ({
          title: pickText(pair(a.titleEn, a.titleMr), locale),
          body: pickText(pair(a.bodyEn, a.bodyMr), locale),
          date: a.publishedAt ? fmt.format(new Date(a.publishedAt)) : "",
          isNew: a.publishedAt ? new Date().getTime() - new Date(a.publishedAt).getTime() < 7 * 24 * 3600 * 1000 : false,
          category: a.category,
          href: detailHref(slug, "announcements", a.id) as string | undefined,
        }))
      : (d.items ?? []).map((a, i) => ({ title: pickText(a.title, locale), body: pickText(a.body, locale), date: pickText(a.date, locale), isNew: i < 2, category: "", href: undefined as string | undefined }));
  const events: CalendarEvent[] = liveEvents.length > 0 ? liveEvents : (d.events ?? []).map((e) => ({ date: e.date, title: pickText(e.title, locale), time: mrTimeFor(locale, e.time), color: e.color }));
  const weekdays = locale === "mr" ? ["र", "सो", "मं", "बु", "गु", "शु", "श"] : ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "long" }).format(new Date(2026, m, 1)));
  const listClass = "mt-[10px] rounded-[10px] border border-[#414141]/20";
  const allHref = `${pageHref(slug, "announcements")}?all=1#live-announcements`;
  const nodes = rows.map((r, i) => {
    const body = (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
        <img src={ROW_PICTURES[i % ROW_PICTURES.length]} alt="" width={64} height={64} className="size-16 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-x-4">
            <span className="block min-w-0 flex-1 truncate text-[18px] leading-6 font-semibold text-black" title={r.title}>
              {r.title}
            </span>
            <span className="flex w-[148px] shrink-0 items-center justify-between gap-2 text-[14px] leading-6 font-medium whitespace-nowrap text-[#414141]">
              {r.date}
              {r.isNew && <span className="inline-flex h-6 w-[46px] items-center justify-center rounded-[2px] bg-[#ff0000] text-[14px] font-medium text-white">{pickText(d.newLabel, locale) || t("newBadge")}</span>}
            </span>
          </span>
          {r.body && (
            <span className="mt-1.5 block truncate text-[14px] leading-6 font-medium text-[#414141]" title={r.body}>
              {r.body}
            </span>
          )}
        </span>
      </>
    );
    return (
      <li key={i}>
        {r.href ? (
          <Link href={r.href} className="flex min-h-[92px] items-center gap-[18px] px-[14px] hover:bg-black/[0.02]">
            {body}
          </Link>
        ) : (
          <div className="flex min-h-[92px] items-center gap-[18px] px-[14px]">{body}</div>
        )}
      </li>
    );
  });
  return (
    <section className="bg-cream pt-8 lg:pt-[82px]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_431px] lg:gap-6 lg:px-[61px]">
        {/* Category tiles link to #live-announcements; this list is the page's live list while no CMS section is published. */}
        <div id="live-announcements" className="flex min-w-0 scroll-mt-[180px] flex-col rounded-[10px] border border-[#414141]/20 bg-white px-[18px] pt-[17px] pb-[21px] lg:min-h-[616px]">
          <div className="flex h-[49px] items-center justify-between">
            <h2 className="flex items-center gap-[13px] text-[20px] leading-6 font-semibold text-black">
              {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
              <img src="/images/figma/pages/ann-head-feed.png" alt="" width={49} height={49} className="-ml-[3px] size-[49px] shrink-0" />
              {pickText(d.heading, locale)}
            </h2>
            {d.viewAll?.href && (
              <Link href={allHref} className={`${pill} w-[111px]`}>
                {pickText(d.viewAll.label, locale)} <ArrowRight className="size-6 shrink-0" aria-hidden />
              </Link>
            )}
          </div>
          {rows.length === 0 ? (
            <ul className={listClass}>
              <li className="p-6 text-center text-sm text-[#414141]">{t("noAnnouncements")}</li>
            </ul>
          ) : (
            <Suspense
              fallback={
                <UnfilteredList limit={5} listClassName={listClass}>
                  {nodes}
                </UnfilteredList>
              }
            >
              <CategoryFilteredList
                categories={rows.map((r) => r.category)}
                limit={5}
                listClassName={listClass}
                emptyClassName="p-6 text-center text-sm text-[#414141]"
                emptyLabel={td("noInCategory")}
                filteredByLabel={td.raw("filteredBy") as string}
                showAllLabel={td("showAll")}
              >
                {nodes}
              </CategoryFilteredList>
            </Suspense>
          )}
          {d.viewAll?.href && (
            <div className="mt-auto flex justify-center pt-[19px]">
              <Link href={allHref} className={`${pill} w-[211px]`}>
                {pickText(d.viewAllLong, locale) || pickText(d.viewAll.label, locale)} <ArrowRight className="size-6 shrink-0" aria-hidden />
              </Link>
            </div>
          )}
        </div>
        <CalendarCard
          title={pickText(d.calendarTitle, locale)}
          initial={new Date().toISOString()}
          events={events}
          weekdays={weekdays}
          monthNames={monthNames}
          allLabel={t("viewFullCalendar")}
          emptyLabel={t("noEvents")}
          figma={{ iconUrl: "/images/figma/pages/ann-head-cal.png", id: "announce-calendar", prevLabel: t("scrollPrev"), nextLabel: t("scrollNext") }}
        />
      </div>
    </section>
  );
}

/** Tint of each deadline tile (Figma: green, orange, blue, purple) and its 82px picture. */
const DEADLINE_STYLE = [
  { c: "#135130", pic: "/images/figma/pages/ann-dl-1.png" },
  { c: "#ff9933", pic: "/images/figma/pages/ann-dl-2.png" },
  { c: "#0866ff", pic: "/images/figma/pages/ann-dl-3.png" },
  { c: "#6a1b9a", pic: "/images/figma/pages/ann-dl-4.png" },
];

/** `deadlines-downloads`: "Important Deadlines" tiles beside the "Downloads" file list (each file is a link). */
export async function DeadlinesDownloadsSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    deadlinesTitle?: B;
    downloadsTitle?: B;
    viewAll?: Btn;
    downloadsViewAll?: Btn;
    deadlines?: { date?: B; title?: B; caption?: B }[];
    files?: { name?: B; type?: string; size?: string; fileId?: string; href?: string }[];
  };
  const t = await getTranslations("public");
  const filesViewAll = d.downloadsViewAll ?? d.viewAll;
  // Published announcements with a file replace the design's sample files (each downloads the file, with its size).
  const live = await liveDownloads(slug, locale);
  const files: { name?: B; type?: string; size?: string; fileId?: string; href?: string }[] =
    live.length > 0 ? live.slice(0, 5).map((f) => ({ name: { en: f.name, mr: f.name }, type: f.type, size: f.size, fileId: f.fileId })) : (d.files ?? []).slice(0, 5);
  return (
    <section className="bg-cream pt-5 pb-8 lg:pt-[29px] lg:pb-[46px]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,835px)_minmax(0,1fr)] lg:px-[61px]">
        <div className="min-w-0 rounded-[10px] border border-[#414141]/20 bg-white px-[19px] pt-[28px] pb-8">
          <div className="flex h-10 items-center justify-between gap-3 lg:pl-[6px]">
            <h2 className="flex items-center gap-[11px] text-[20px] leading-6 font-semibold text-black">
              {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
              <img src="/images/figma/pages/ann-head-dead.png" alt="" width={40} height={40} className="size-10 shrink-0" />
              {pickText(d.deadlinesTitle, locale)}
            </h2>
            {d.viewAll?.href && (
              <Link href={resolveHref("page:announcements#announce-calendar", slug)} className={`${pill} w-[111px]`}>
                {pickText(d.viewAll.label, locale)} <ArrowRight className="size-6 shrink-0" aria-hidden />
              </Link>
            )}
          </div>
          <ul className="mt-[33px] grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-[15px]">
            {(d.deadlines ?? []).map((x, i) => {
              const s = DEADLINE_STYLE[i % DEADLINE_STYLE.length]!;
              return (
                <li key={i} className="flex min-h-[272px] flex-col items-center rounded-[10px] px-3 pt-6 text-center" style={{ backgroundColor: `${s.c}0d` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                  <img src={s.pic} alt="" width={82} height={82} className="size-[82px] shrink-0" />
                  <p className="mt-[14px] text-[20px] leading-6 font-semibold whitespace-nowrap" style={{ color: s.c }}>
                    {pickText(x.date, locale)}
                  </p>
                  <p className="mt-[21px] text-[14px] leading-6 font-medium text-black">{pickText(x.title, locale)}</p>
                  {pickText(x.caption, locale) && <p className="mt-[6px] text-[14px] leading-6 font-medium text-black">{pickText(x.caption, locale)}</p>}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-[10px] border border-[#414141]/20 bg-white px-[21px] pt-[22px] pb-[31px]">
          <div className="flex h-[53px] items-center justify-between gap-3">
            <h2 className="flex items-center gap-[13px] text-[20px] leading-6 font-semibold text-black">
              {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
              <img src="/images/figma/pages/ann-head-dl.png" alt="" width={53} height={53} className="-ml-px size-[53px] shrink-0" />
              {pickText(d.downloadsTitle, locale)}
            </h2>
            {filesViewAll?.href && (
              <Link href={resolveHref(filesViewAll.href, slug)} className={`${pill} w-[111px]`}>
                {pickText(filesViewAll.label, locale)} <ArrowRight className="size-6 shrink-0" aria-hidden />
              </Link>
            )}
          </div>
          <ul className="mt-[13px]">
            {files.map((f, i) => {
              const file = f.fileId ? publicMediaUrl(slug, f.fileId) : undefined;
              const href = file ?? (f.href ? resolveHref(f.href, slug) : undefined);
              const name = pickText(f.name, locale);
              const inner = (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                  <img src="/images/figma/pages/ann-pdf.png" alt="" width={28} height={29} className="h-[29px] w-7 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-[14px] leading-6 font-medium text-black" title={name}>
                    {name}
                  </span>
                  <span className="flex shrink-0 items-center gap-[10px] text-[14px] leading-6 font-medium whitespace-nowrap text-[#707070]">
                    {f.type}
                    {f.type && f.size && <span aria-hidden className="size-[5px] rounded-full bg-[#707070]" />}
                    {f.size}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                  <img src="/images/figma/pages/ann-dlicon.png" alt="" width={31} height={31} className="size-[31px] shrink-0" />
                </>
              );
              const cls = "-mt-px flex h-[58px] items-center gap-[14px] rounded-[10px] border border-[#414141]/20 bg-white px-[5px] first:mt-0";
              return (
                <li key={i}>
                  {file ? (
                    <a href={file} download aria-label={`${t("download")}: ${name}`} className={`${cls} hover:bg-black/[0.02]`}>
                      {inner}
                    </a>
                  ) : href ? (
                    <Link href={href} className={`${cls} hover:bg-black/[0.02]`}>
                      {inner}
                    </Link>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

const STRIP_ICONS: { Icon: LucideIcon; fg: string }[] = [
  { Icon: Sprout, fg: "text-[#3f8f26]" },
  { Icon: UserRound, fg: "text-[#f5871f]" },
  { Icon: GraduationCap, fg: "text-[#1a62e0]" },
  { Icon: HeartHandshake, fg: "text-[#6a1b9a]" },
  { Icon: Megaphone, fg: "text-[#135130]" },
  { Icon: Flag, fg: "text-[#e8202a]" },
];

/**
 * `service-strip`: quick tiles on a tinted band (Figma: 78px white tiles with a 54px picture, 14px green label, 12px caption). An optional
 * heading (with its picture) sits above the tiles: Announcements has it (6 tiles), Schemes does not (5 tiles).
 */
export function ServiceStripSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    spaceAfter?: number;
    heading?: B;
    headingIconUrl?: string;
    bg?: string;
    items?: { label?: B; caption?: B; href?: string; iconUrl?: string }[];
  };
  const items = d.items ?? [];
  const heading = pickText(d.heading, locale);
  return (
    <>
      <section
        className="bg-[#138808]/5 py-8 lg:pt-[33px] lg:pb-[33px]"
        style={d.bg ? { backgroundColor: d.bg } : undefined}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
          {heading && (
            <h2 className="-mt-2 mb-[18px] flex items-center gap-[11px] text-[20px] leading-6 font-semibold text-black lg:-mt-[9px]">
              {d.headingIconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- static design asset
                <img
                  src={d.headingIconUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 shrink-0"
                />
              ) : (
                <Wheat className="size-6 text-[#135130]" aria-hidden />
              )}
              {heading}
            </h2>
          )}
          <ul
            className={`grid gap-3 sm:grid-cols-3 lg:gap-x-[10px] ${items.length === 6 ? "lg:grid-cols-6 lg:gap-x-6" : "lg:grid-cols-5"}`}
          >
            {items.map((it, i) => {
              const { Icon, fg } = STRIP_ICONS[i % STRIP_ICONS.length]!;
              return (
                <li key={i}>
                  <Link
                    href={resolveHref(it.href ?? "page:home", slug)}
                    className="flex h-[78px] items-center gap-3 rounded-[10px] bg-white px-2.5 hover:shadow-md"
                  >
                    {it.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- static design asset
                      <img
                        src={it.iconUrl}
                        alt=""
                        width={54}
                        height={54}
                        className="size-[54px] shrink-0"
                      />
                    ) : (
                      <Icon
                        className={`size-[54px] shrink-0 p-3 ${fg}`}
                        strokeWidth={1.8}
                        aria-hidden
                      />
                    )}
                    <span className="min-w-0 leading-6">
                      <span className="block truncate text-[14px] font-semibold text-[#135130]">
                        {pickText(it.label, locale)}
                      </span>
                      <span className="block truncate text-[12px] text-[#414141]">
                        {pickText(it.caption, locale)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      {d.spaceAfter ? (
        <div
          aria-hidden
          className="hidden lg:block"
          style={{ height: d.spaceAfter }}
        />
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ Citizen Services & Online Forms */

const RTS_ICONS: LucideIcon[] = [
  FileText,
  UserRound,
  House,
  IdCard,
  ShieldCheck,
  FileText,
  House,
  ScrollText,
  Users,
  BriefcaseBusiness,
];
/** Figma pictures of the ten RTS tiles (birth, death, domicile, income, caste, non-creamy layer, residence, legal heir, senior citizen, other). */
const RTS_PICTURES = Array.from(
  { length: 10 },
  (_, i) => `/images/figma/pages/svc-rts-${i + 1}.png`,
);

/**
 * `rts-grid`: "Right to Service (RTS) – Apply Online" certificate tiles with a portal button; the card overlaps the hero by 128px
 * (Figma 1320×651 card: 231×191 tiles with a 68px picture, 58px button).
 */
export function RtsGridSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    heading?: B;
    subheading?: B;
    items?: { label?: B; caption?: B; href?: string; iconUrl?: string }[];
    action?: { label?: B; href?: string };
  };
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[128px] lg:px-[60px]">
      <div className="rounded-[20px] bg-white px-5 pt-8 pb-8 shadow-[0_2px_16px_rgba(0,0,0,0.12)] sm:px-[30px] lg:pt-[35px] lg:pb-[35px]">
        <h2 className="text-center text-[24px] leading-9 font-semibold text-black lg:text-[26px]">
          {pickText(d.heading, locale)}
        </h2>
        <p className="mt-[9px] text-center text-[16px] leading-[26px] text-[#414141] lg:text-[17px]">
          {pickText(d.subheading, locale)}
        </p>
        <ul className="mt-[23px] grid grid-cols-2 gap-[21px] sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-[22px]">
          {(d.items ?? []).map((it, i) => {
            const Icon = RTS_ICONS[i % RTS_ICONS.length]!;
            const pic = it.iconUrl ?? RTS_PICTURES[i];
            return (
              <li key={i}>
                <Link
                  href={resolveHref(it.href ?? "page:grievance", slug)}
                  {...(it.href?.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="flex h-full min-h-[191px] flex-col items-center rounded-[10px] border border-black/[0.07] bg-white px-2 pt-[26px] pb-5 text-center shadow-[0_0_8px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-0.5"
                >
                  {pic ? (
                    // eslint-disable-next-line @next/next/no-img-element -- static design asset
                    <img
                      src={pic}
                      alt=""
                      width={68}
                      height={68}
                      className="size-[68px] shrink-0"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex size-[68px] items-center justify-center rounded-[17px] bg-[#e3f1e6] text-[#18803d]"
                    >
                      <Icon className="size-8" strokeWidth={2.2} />
                    </span>
                  )}
                  <span className="mt-4 text-[16px] leading-6 font-bold whitespace-nowrap text-black">
                    {pickText(it.label, locale)}
                  </span>
                  <span className="mt-[7px] text-[13px] leading-5 whitespace-nowrap text-[#333]">
                    {pickText(it.caption, locale)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {d.action?.href && (
          <div className="mt-[27px] flex justify-center">
            <Link
              href={resolveHref(d.action.href, slug)}
              {...(d.action.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="inline-flex h-[58px] w-[232px] items-center justify-center gap-5 rounded-[8px] bg-[#135130] text-[16px] font-semibold whitespace-nowrap text-white shadow hover:opacity-90"
            >
              {pickText(d.action.label, locale)}{" "}
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

const ACTION_STYLES = [
  { fg: "text-[#6a2bc4]", border: "border-[#8d5ae8]", Icon: Settings },
  { fg: "text-[#f5741f]", border: "border-[#f5871f]", Icon: MessageSquareText },
  { fg: "text-[#1a62e0]", border: "border-[#3b82f0]", Icon: HandCoins },
  { fg: "text-[#135130]", border: "border-[#3f8a5d]", Icon: SearchCheck },
];

/**
 * `action-cards`: four service cards (grievance, feedback, tax, status), Figma 314×429: 52px picture + 20px title, 18px text,
 * ticked list, full-width outline button.
 */
export function ActionCardsSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    items?: {
      title?: B;
      body?: B;
      bullets?: B[];
      action?: B;
      href?: string;
      iconUrl?: string;
    }[];
  };
  return (
    <section className="bg-cream pt-8 pb-10 lg:pt-[57px] lg:pb-[83px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-[22px]">
          {(d.items ?? []).map((it, i) => {
            const s = ACTION_STYLES[i % ACTION_STYLES.length]!;
            const pic =
              it.iconUrl ?? `/images/figma/pages/svc-act-${(i % 4) + 1}.png`;
            return (
              <li
                key={i}
                className="flex min-h-[429px] flex-col rounded-[14px] border border-black/10 bg-white px-[18px] pt-[27px] pb-8 shadow-[0_0_10px_rgba(0,0,0,0.04)]"
              >
                <h3
                  className={`flex items-center gap-3 text-[19px] leading-7 font-semibold whitespace-nowrap ${s.fg}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- static design asset */}
                  <img
                    src={pic}
                    alt=""
                    width={52}
                    height={52}
                    className="size-[52px] shrink-0 -ml-1.5"
                  />
                  {pickText(it.title, locale)}
                </h3>
                <p className="mt-3.5 pl-1.5 text-[18px] leading-9 text-[#333]">
                  {pickText(it.body, locale)}
                </p>
                <ul className="mt-7 space-y-[19.5px] pl-1.5 text-[16px] leading-6 text-[#333]">
                  {(it.bullets ?? []).map((b, k) => (
                    <li key={k} className="flex items-center gap-3.5">
                      <CircleCheck
                        className="size-[19px] shrink-0 text-[#18803d]"
                        aria-hidden
                      />
                      {pickText(b, locale)}
                    </li>
                  ))}
                </ul>
                <Link
                  href={resolveHref(it.href ?? "page:services", slug)}
                  className={`mt-auto flex h-[60px] w-full items-center justify-center gap-8 rounded-[10px] border bg-white px-4 text-[18px] font-semibold whitespace-nowrap hover:bg-black/[0.02] ${s.border} ${s.fg}`}
                >
                  {pickText(it.action, locale)}{" "}
                  <ArrowRight className="size-5" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** `help-card`: "Need Help?" — illustration, contact details and the common queries (each a link to the page that answers it). */
export function HelpCardSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    heading?: B;
    body?: B;
    imageUrl?: string;
    phone?: string;
    phoneHours?: B;
    email?: string;
    emailNote?: B;
    queriesTitle?: B;
    queries?: (B | { label?: B; href?: string })[];
  };
  const queries = (d.queries ?? []).map((q) =>
    q && typeof q === "object" && "label" in q
      ? q
      : { label: q as B, href: undefined },
  );
  return (
    <section className="bg-cream pt-2 pb-10 lg:pt-0 lg:pb-[17px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <div className="grid items-center gap-6 rounded-[10px] border border-black/20 bg-white p-5 lg:grid-cols-[304px_minmax(0,1fr)_minmax(0,504px)] lg:gap-8 lg:py-7 lg:pr-7 lg:pl-5">
          {d.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- static design asset
            <img
              src={d.imageUrl}
              alt=""
              width={304}
              height={274}
              loading="lazy"
              className="mx-auto hidden h-auto w-full max-w-[300px] sm:block"
            />
          ) : (
            <span
              aria-hidden
              className="mx-auto hidden size-[160px] items-center justify-center rounded-full bg-[#e3f1e9] text-[#135130] sm:flex"
            >
              <CircleHelp className="size-16" strokeWidth={1.4} />
            </span>
          )}
          <div>
            <h2 className="text-[26px] leading-9 font-bold text-black">
              {pickText(d.heading, locale)}
            </h2>
            <p className="mt-2 max-w-[310px] text-[16px] leading-7 text-[#333]">
              {pickText(d.body, locale)}
            </p>
            <p className="mt-6 flex items-center gap-4 text-black">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e6f1e9] text-[#18803d]"
              >
                <Phone className="size-5" />
              </span>
              <span>
                <a
                  href={`tel:${(d.phone ?? "").replace(/\s/g, "")}`}
                  className="text-[17px] font-bold hover:underline"
                >
                  {d.phone}
                </a>
                <span className="block text-[14px] text-[#333]">
                  {pickText(d.phoneHours, locale)}
                </span>
              </span>
            </p>
            <p className="mt-5 flex items-center gap-4 text-black">
              <span
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e6f1e9] text-[#18803d]"
              >
                <Mail className="size-5" />
              </span>
              <span>
                <a
                  href={`mailto:${d.email}`}
                  className="text-[17px] font-bold hover:underline"
                >
                  {d.email}
                </a>
                <span className="block text-[14px] text-[#333]">
                  {pickText(d.emailNote, locale)}
                </span>
              </span>
            </p>
          </div>
          <div className="rounded-[10px] border border-black/10 bg-[#f6f7f6] p-[19px] pt-[22px]">
            <h3 className="px-3 text-[17.5px] leading-6 font-semibold text-[#18803d]">
              {pickText(d.queriesTitle, locale)}
            </h3>
            <ul className="mt-4 space-y-[2.5px]">
              {queries.map((q, i) => {
                const inner = (
                  <>
                    <span className="min-w-0 flex-1">
                      {pickText(q.label, locale)}
                    </span>
                    <ChevronRight className="size-5 shrink-0" aria-hidden />
                  </>
                );
                const cls =
                  "flex h-[49px] items-center gap-3 rounded-[6px] border border-black/5 bg-white px-4 text-[14px] text-black";
                return (
                  <li key={i}>
                    {q.href ? (
                      <Link
                        href={resolveHref(q.href, slug)}
                        className={`${cls} hover:border-[#135130]/40 hover:text-[#135130]`}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className={cls}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
