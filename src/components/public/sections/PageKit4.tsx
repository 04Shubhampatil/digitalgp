import {
  ArrowRight,
  ChevronRight,
  CircleCheck,
  BriefcaseBusiness,
  BriefcaseMedical,
  CalendarDays,
  CircleHelp,
  Download,
  FileText,
  Flag,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  House,
  IdCard,
  IndianRupee,
  Landmark,
  Mail,
  Megaphone,
  MessageSquareText,
  Phone,
  ReceiptText,
  ScrollText,
  SearchCheck,
  Settings,
  ShieldCheck,
  Sprout,
  Stethoscope,
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
import { listPublicAnnouncementCategories, listPublicAnnouncements, publicMediaUrl } from "@/lib/api/public";
import { detailHref, resolveHref } from "@/lib/href";
import { CalendarCard, type CalendarEvent } from "./CalendarCard";
import { CategoryFilteredList, UnfilteredList } from "./KitClient";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;
interface Btn {
  label?: B;
  href?: string;
}

const card = "rounded-[10px] border border-black/15 bg-white shadow-[0_0_10px_rgba(0,0,0,0.08)]";

/* ------------------------------------------------------------------ Announcements & Circulars */

const CAT_ICONS: { Icon: LucideIcon; fg: string }[] = [
  { Icon: Users, fg: "text-[#18803d]" },
  { Icon: Users, fg: "text-[#f5871f]" },
  { Icon: FileText, fg: "text-[#1a62e0]" },
  { Icon: ReceiptText, fg: "text-[#6a2bc4]" },
  { Icon: Megaphone, fg: "text-[#18803d]" },
  { Icon: CalendarDays, fg: "text-[#e8202a]" },
];

/** Link that filters the live announcement list of the announcements page by category. */
export function categoryHref(slug: string, category: string): string {
  return `${pageHref(slug, "announcements")}?category=${encodeURIComponent(category)}#live-announcements`;
}

/** Categories of the live announcements with their counts (GET /public/:slug/announcements/categories); [] when unavailable. */
export async function liveAnnouncementCategories(slug: string): Promise<PublicAnnouncementCategoryDto[]> {
  return (await listPublicAnnouncementCategories(slug).catch(() => null)) ?? [];
}

const EVENT_COLOURS = ["#135130", "#f5871f", "#1a62e0", "#6a1b9a", "#e8202a"];
const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
const isoDay = (d: Date) => IST_DAY.format(d);

/**
 * Calendar events from published announcements (GET /public/:slug/announcements?events=true&from&to): about six months
 * back and six months ahead, each linking to its announcement page.
 */
export async function liveCalendarEvents(slug: string, locale: SectionProps["locale"]): Promise<CalendarEvent[]> {
  const now = Date.now();
  const res = await listPublicAnnouncements(slug, { events: "true", from: isoDay(new Date(now - 180 * 864e5)), to: isoDay(new Date(now + 200 * 864e5)), limit: 100 }).catch(() => null);
  const time = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
  return (res?.data ?? [])
    .filter((a) => a.eventStartAt)
    .map((a, i) => ({
      date: isoDay(new Date(a.eventStartAt!)),
      title: pickText(pair(a.titleEn, a.titleMr), locale),
      time: [time.format(new Date(a.eventStartAt!)), a.eventEndAt ? time.format(new Date(a.eventEndAt)) : ""].filter(Boolean).join(" – "),
      color: EVENT_COLOURS[i % EVENT_COLOURS.length],
      location: pickText(pair(a.eventLocationEn, a.eventLocationMr), locale) || undefined,
      href: detailHref(slug, "announcements", a.id),
    }));
}

/** Downloads: published announcements that carry a file (GET /public/:slug/announcements?hasAttachment=true). */
export async function liveDownloads(slug: string, locale: SectionProps["locale"]) {
  const res = await listPublicAnnouncements(slug, { hasAttachment: "true", limit: 20 }).catch(() => null);
  return (res?.data ?? [])
    .filter((a) => a.attachment)
    .map((a) => {
      const f = a.attachment!;
      const ext = f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : (f.mimeType.split("/").pop() ?? "").toUpperCase();
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

/**
 * `announce-categories`: six category shortcuts overlapping the hero (filled 44px icons). With published announcements
 * the tiles are the live categories with their counts and filter the list below (?category=…#live-announcements);
 * otherwise the design's labels, which jump to the list.
 */
export async function AnnounceCategoriesSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public.detail");
  const d = data as { viewAll?: B; href?: string; items?: { label?: B; href?: string }[] };
  const live = await liveAnnouncementCategories(slug);
  const tiles =
    live.length > 0
      ? live.slice(0, 6).map((c) => ({ label: c.category, caption: t("announcementCount", { n: c.count }), href: categoryHref(slug, c.category) }))
      : (d.items ?? []).map((it) => ({ label: pickText(it.label, locale), caption: pickText(d.viewAll, locale), href: resolveHref(it.href ?? d.href ?? "page:announcements#announce-feed", slug) }));
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[108px] lg:px-[60px]">
      <ul className={`grid grid-cols-2 gap-y-4 rounded-[20px] bg-white px-4 py-5 shadow-[0_2px_16px_rgba(0,0,0,0.18)] sm:grid-cols-3 lg:divide-x lg:divide-black/15 lg:py-[22px] ${tiles.length >= 6 ? "lg:grid-cols-6" : tiles.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {tiles.map((it, i) => {
          const { Icon, fg } = CAT_ICONS[i % CAT_ICONS.length]!;
          return (
            <li key={i}>
              <Link href={it.href} className="group flex flex-col items-center gap-1 py-2 text-center">
                <Icon className={`size-11 ${fg}`} fill="currentColor" stroke="#fff" strokeWidth={1.4} aria-hidden />
                <span className="mt-2 text-[22px] leading-7 font-semibold text-black group-hover:text-[#135130]">{it.label}</span>
                <span className="text-[14px] text-[#333]">{it.caption}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const ROW_ICONS: { Icon: LucideIcon; bg: string; fg: string }[] = [
  { Icon: Landmark, bg: "bg-[#e3f1e9]", fg: "text-[#18803d]" },
  { Icon: Stethoscope, bg: "bg-[#fdeedd]", fg: "text-[#f5871f]" },
  { Icon: FileText, bg: "bg-[#e2edfa]", fg: "text-[#1a62e0]" },
  { Icon: ScrollText, bg: "bg-[#efe6f8]", fg: "text-[#6a2bc4]" },
  { Icon: UserRound, bg: "bg-[#fdeedd]", fg: "text-[#f5871f]" },
];

const pill = "inline-flex items-center gap-2 rounded-full border border-[#135130] bg-white px-4 py-2 text-[14px] text-[#135130] hover:bg-[#135130]/5";

/**
 * `announce-feed`: latest announcements (published ones when present, each opening its own page, filtered by the
 * `category` query parameter) beside the interactive calendar (published events, else the design's sample events).
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
  const fmt = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
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
  const events: CalendarEvent[] = liveEvents.length > 0 ? liveEvents : (d.events ?? []).map((e) => ({ date: e.date, title: pickText(e.title, locale), time: e.time, color: e.color }));
  const weekdays = locale === "mr" ? ["र", "सो", "मं", "बु", "गु", "शु", "श"] : ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "long" }).format(new Date(2026, m, 1)));
  const listClass = "mt-4 rounded-[8px] border border-black/15";
  const nodes = rows.map((r, i) => {
    const { Icon, bg, fg } = ROW_ICONS[i % ROW_ICONS.length]!;
    const body = (
      <>
        <span aria-hidden className={`flex size-11 shrink-0 items-center justify-center self-start rounded-[8px] ${bg} ${fg}`}>
          <Icon className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start gap-x-4 gap-y-1">
            <span className="min-w-0 flex-1 text-[18px] leading-7 font-semibold text-black">{r.title}</span>
            <span className="flex w-[148px] shrink-0 items-center justify-between gap-2 pt-1 text-[14px] text-[#333]">
              {r.date}
              {r.isNew && <span className="rounded-[2px] bg-[#ff0000] px-2 py-0.5 text-[13px] font-medium text-white">{pickText(d.newLabel, locale) || t("newBadge")}</span>}
            </span>
          </span>
          {r.body && <span className="mt-1 line-clamp-2 block text-[14px] leading-6 text-[#333]">{r.body}</span>}
        </span>
      </>
    );
    return (
      <li key={i}>
        {r.href ? (
          <Link href={r.href} className="flex items-center gap-5 px-4 py-4 hover:bg-black/[0.02]">
            {body}
          </Link>
        ) : (
          <div className="flex items-center gap-5 px-4 py-4">{body}</div>
        )}
      </li>
    );
  });
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-[62px]">
        {/* Category tiles link to #live-announcements; this list is the page's live list while no CMS section is published. */}
        <div id="live-announcements" className={`${card} scroll-mt-[180px] p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-4 text-[22px] font-semibold text-black">
              <Megaphone className="size-8 -scale-x-100 text-[#135130]" fill="currentColor" aria-hidden /> {pickText(d.heading, locale)}
            </h2>
            {d.viewAll?.href && (
              <Link href={resolveHref(d.viewAll.href, slug)} className={pill}>
                {pickText(d.viewAll.label, locale)} <ArrowRight className="size-4" aria-hidden />
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
                <UnfilteredList limit={8} listClassName={listClass}>
                  {nodes}
                </UnfilteredList>
              }
            >
              <CategoryFilteredList
                categories={rows.map((r) => r.category)}
                limit={8}
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
            <div className="mt-4 flex justify-center">
              <Link href={resolveHref(d.viewAll.href, slug)} className={pill}>
                {pickText(d.viewAllLong, locale) || pickText(d.viewAll.label, locale)} <ArrowRight className="size-4" aria-hidden />
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
        />
      </div>
    </section>
  );
}

const DEADLINE_STYLE = [
  { bg: "bg-[#f1f4f1]", ring: "bg-[#e2ece4]", fg: "text-[#135130]", Icon: IndianRupee },
  { bg: "bg-[#fff8f1]", ring: "bg-[#fdebd8]", fg: "text-[#f5871f]", Icon: Landmark },
  { bg: "bg-[#f1f6fe]", ring: "bg-[#e0ebfb]", fg: "text-[#1a62e0]", Icon: BriefcaseMedical },
  { bg: "bg-[#f6f2fb]", ring: "bg-[#ebe2f7]", fg: "text-[#6a2bc4]", Icon: Users },
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
    live.length > 0 ? live.slice(0, 6).map((f) => ({ name: { en: f.name, mr: f.name }, type: f.type, size: f.size, fileId: f.fileId })) : (d.files ?? []);
  return (
    <section className="bg-cream py-4">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,835px)_minmax(0,1fr)] lg:px-[62px]">
        <div className={`${card} p-5 lg:px-[18px] lg:pt-6 lg:pb-8`}>
          <div className="flex items-center justify-between gap-3 lg:pl-2">
            <h2 className="flex items-center gap-4 text-[22px] font-semibold text-black">
              <CalendarDays className="size-8 text-[#e8202a]" aria-hidden /> {pickText(d.deadlinesTitle, locale)}
            </h2>
            {d.viewAll?.href && (
              <Link href={resolveHref(d.viewAll.href, slug)} className={pill}>
                {pickText(d.viewAll.label, locale)} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(d.deadlines ?? []).map((x, i) => {
              const s = DEADLINE_STYLE[i % DEADLINE_STYLE.length]!;
              return (
                <li key={i} className={`flex min-h-[200px] flex-col items-center gap-1 rounded-[8px] px-3 pt-8 pb-6 text-center ${s.bg}`}>
                  <span aria-hidden className={`flex size-[60px] items-center justify-center rounded-full ${s.ring} ${s.fg}`}>
                    <s.Icon className="size-8" strokeWidth={2} />
                  </span>
                  <p className={`mt-4 text-[20px] leading-7 font-semibold ${s.fg}`}>{pickText(x.date, locale)}</p>
                  <p className="mt-2 text-[14px] leading-[30px] text-black">{pickText(x.title, locale)}</p>
                  {pickText(x.caption, locale) && <p className="text-[14px] leading-[22px] text-black">{pickText(x.caption, locale)}</p>}
                </li>
              );
            })}
          </ul>
        </div>
        <div className={`${card} p-5 lg:px-5 lg:pt-6 lg:pb-7`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-4 text-[22px] font-semibold text-black">
              <Download className="size-8 text-[#135130]" strokeWidth={2.4} aria-hidden /> {pickText(d.downloadsTitle, locale)}
            </h2>
            {filesViewAll?.href && (
              <Link href={resolveHref(filesViewAll.href, slug)} className={pill}>
                {pickText(filesViewAll.label, locale)} <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
          <ul className="mt-5 space-y-1.5">
            {files.map((f, i) => {
              const file = f.fileId ? publicMediaUrl(slug, f.fileId) : undefined;
              const href = file ?? (f.href ? resolveHref(f.href, slug) : undefined);
              const name = pickText(f.name, locale);
              const inner = (
                <>
                  <FileText className="size-5 shrink-0 text-[#e8202a]" aria-hidden />
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-black">{name}</span>
                  <span className="shrink-0 text-[13px] text-[#555]">{[f.type, f.size].filter(Boolean).join(" • ")}</span>
                  <Download className="size-5 shrink-0 text-[#135130]" aria-hidden />
                </>
              );
              const cls = "flex items-center gap-4 rounded-[6px] border border-black/15 bg-white px-4 py-3.5";
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

/** `service-strip`: "Access Services & Schemes" — six quick tiles on a tinted band. */
export function ServiceStripSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; items?: { label?: B; caption?: B; href?: string }[] };
  return (
    <section className="bg-[rgba(34,138,83,0.05)] py-6">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-black">
          <Wheat className="size-5 text-[#135130]" aria-hidden /> {pickText(d.heading, locale)}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(d.items ?? []).map((it, i) => {
            const { Icon, fg } = STRIP_ICONS[i % STRIP_ICONS.length]!;
            return (
              <li key={i}>
                <Link href={resolveHref(it.href ?? "#", slug)} className="flex items-center gap-3 rounded-[6px] bg-white px-4 py-3 shadow-sm hover:shadow">
                  <Icon className={`size-7 ${fg}`} strokeWidth={1.8} aria-hidden />
                  <span>
                    <span className="block text-[13px] font-semibold text-black">{pickText(it.label, locale)}</span>
                    <span className="block text-[11px] text-[#414141]">{pickText(it.caption, locale)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Citizen Services & Online Forms */

const RTS_ICONS: LucideIcon[] = [FileText, UserRound, House, IdCard, ShieldCheck, FileText, House, ScrollText, Users, BriefcaseBusiness];

/** `rts-grid`: "Right to Service (RTS) – Apply Online" certificate tiles with a portal button; the card overlaps the hero (Figma ~110px). */
export function RtsGridSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; subheading?: B; items?: { label?: B; caption?: B; href?: string }[]; action?: { label?: B; href?: string } };
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[110px] lg:px-[60px]">
      <div className="rounded-[20px] bg-white px-5 pt-8 pb-8 shadow-[0_2px_16px_rgba(0,0,0,0.12)] sm:px-[30px]">
        <h2 className="text-center text-[28px] leading-10 font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <p className="mt-2 text-center text-[18px] leading-7 text-[#414141]">{pickText(d.subheading, locale)}</p>
        <ul className="mt-7 grid grid-cols-2 gap-[22px] sm:grid-cols-3 lg:grid-cols-5">
          {(d.items ?? []).map((it, i) => {
            const Icon = RTS_ICONS[i % RTS_ICONS.length]!;
            return (
              <li key={i}>
                <Link
                  href={resolveHref(it.href ?? "page:grievance", slug)}
                  className="flex h-full min-h-[190px] flex-col items-center rounded-[10px] border border-black/10 bg-white px-3 pt-6 pb-5 text-center shadow-[0_0_10px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-0.5"
                >
                  <span aria-hidden className="flex size-[62px] items-center justify-center rounded-[10px] bg-[#e3f1e6] text-[#18803d]">
                    <Icon className="size-8" strokeWidth={2.2} />
                  </span>
                  <span className="mt-5 text-[16px] leading-6 font-bold text-black">{pickText(it.label, locale)}</span>
                  <span className="mt-1.5 text-[14px] leading-5 text-[#555]">{pickText(it.caption, locale)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {d.action?.href && (
          <div className="mt-7 flex justify-center">
            <Link href={resolveHref(d.action.href, slug)} className="inline-flex items-center gap-5 rounded-[8px] bg-[#135130] px-6 py-3.5 text-[16px] font-medium text-white shadow hover:opacity-90">
              {pickText(d.action.label, locale)} <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

const ACTION_STYLES = [
  { fg: "text-[#6a2bc4]", border: "border-[#6a2bc4]", ring: "bg-[#efe8fb]", bg: "bg-[#fbfaff]", Icon: Settings },
  { fg: "text-[#f5741f]", border: "border-[#f5871f]", ring: "bg-[#fff1e3]", bg: "bg-[#fffdfa]", Icon: MessageSquareText },
  { fg: "text-[#1a62e0]", border: "border-[#1a62e0]", ring: "bg-[#e7effc]", bg: "bg-[#fafcff]", Icon: HandCoins },
  { fg: "text-[#135130]", border: "border-[#135130]", ring: "bg-[#e6f1e9]", bg: "bg-[#fafdfb]", Icon: SearchCheck },
];

/** `action-cards`: four service cards (grievance, feedback, tax, status): 36px icon + 20px title, 18px text, ticked list, full-width outline button. */
export function ActionCardsSection({ slug, locale, data }: SectionProps) {
  const d = data as { items?: { title?: B; body?: B; bullets?: B[]; action?: B; href?: string }[] };
  return (
    <section className="bg-cream py-12">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(d.items ?? []).map((it, i) => {
            const s = ACTION_STYLES[i % ACTION_STYLES.length]!;
            return (
              <li key={i} className={`flex flex-col rounded-[10px] border border-black/10 px-5 pt-6 pb-7 shadow-[0_0_10px_rgba(0,0,0,0.04)] ${s.bg}`}>
                <h3 className={`flex items-center gap-3 text-[20px] leading-7 font-semibold ${s.fg}`}>
                  <span aria-hidden className={`flex size-11 shrink-0 items-center justify-center rounded-full ${s.ring}`}>
                    <s.Icon className="size-[26px]" />
                  </span>
                  {pickText(it.title, locale)}
                </h3>
                <p className="mt-5 text-[18px] leading-[31px] text-[#333]">{pickText(it.body, locale)}</p>
                <ul className="mt-6 space-y-3 text-[16px] leading-6 text-[#333]">
                  {(it.bullets ?? []).map((b, k) => (
                    <li key={k} className="flex items-center gap-3">
                      <CircleCheck className="size-[18px] shrink-0 text-[#18803d]" aria-hidden />
                      {pickText(b, locale)}
                    </li>
                  ))}
                </ul>
                <Link href={resolveHref(it.href ?? "page:services", slug)} className={`mt-auto flex w-full items-center justify-center gap-8 rounded-[6px] border bg-white px-4 py-3.5 text-[17px] font-medium hover:bg-black/[0.02] ${s.border} ${s.fg}`}>
                  {pickText(it.action, locale)} <ArrowRight className="size-5" aria-hidden />
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
  const queries = (d.queries ?? []).map((q) => (q && typeof q === "object" && "label" in q ? q : { label: q as B, href: undefined }));
  return (
    <section className="bg-cream py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[60px]">
        <div className="grid items-center gap-6 rounded-[10px] border border-black/20 bg-white p-5 lg:grid-cols-[300px_minmax(0,1fr)_minmax(0,500px)] lg:gap-8 lg:py-7 lg:pr-6 lg:pl-5">
          {d.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- static design asset
            <img src={d.imageUrl} alt="" width={304} height={274} loading="lazy" className="mx-auto hidden h-auto w-full max-w-[300px] sm:block" />
          ) : (
            <span aria-hidden className="mx-auto hidden size-[160px] items-center justify-center rounded-full bg-[#e3f1e9] text-[#135130] sm:flex">
              <CircleHelp className="size-16" strokeWidth={1.4} />
            </span>
          )}
          <div>
            <h2 className="text-[26px] leading-9 font-bold text-black">{pickText(d.heading, locale)}</h2>
            <p className="mt-2 max-w-[310px] text-[16px] leading-7 text-[#333]">{pickText(d.body, locale)}</p>
            <p className="mt-6 flex items-center gap-4 text-black">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e6f1e9] text-[#18803d]">
                <Phone className="size-5" />
              </span>
              <span>
                <a href={`tel:${(d.phone ?? "").replace(/\s/g, "")}`} className="text-[17px] font-bold hover:underline">
                  {d.phone}
                </a>
                <span className="block text-[14px] text-[#333]">{pickText(d.phoneHours, locale)}</span>
              </span>
            </p>
            <p className="mt-5 flex items-center gap-4 text-black">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#e6f1e9] text-[#18803d]">
                <Mail className="size-5" />
              </span>
              <span>
                <a href={`mailto:${d.email}`} className="text-[17px] font-bold hover:underline">
                  {d.email}
                </a>
                <span className="block text-[14px] text-[#333]">{pickText(d.emailNote, locale)}</span>
              </span>
            </p>
          </div>
          <div className="rounded-[10px] border border-black/10 bg-[#f6f7f6] p-4 pt-5">
            <h3 className="px-1 text-[18px] font-semibold text-[#18803d]">{pickText(d.queriesTitle, locale)}</h3>
            <ul className="mt-4 space-y-1.5">
              {queries.map((q, i) => {
                const inner = (
                  <>
                    <span className="min-w-0 flex-1">{pickText(q.label, locale)}</span>
                    <ChevronRight className="size-5 shrink-0" aria-hidden />
                  </>
                );
                const cls = "flex items-center gap-3 rounded-[6px] border border-black/5 bg-white px-4 py-3 text-[14px] text-black";
                return (
                  <li key={i}>
                    {q.href ? (
                      <Link href={resolveHref(q.href, slug)} className={`${cls} hover:border-[#135130]/40 hover:text-[#135130]`}>
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
