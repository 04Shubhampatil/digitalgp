import {
  ArrowRight,
  BriefcaseBusiness,
  Calendar,
  CircleHelp,
  CreditCard,
  Download,
  FileText,
  Flag,
  GraduationCap,
  HandCoins,
  HeartHandshake,
  House,
  IdCard,
  Landmark,
  Mail,
  Megaphone,
  Phone,
  ScrollText,
  Search,
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
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { listPublicAnnouncements, publicMediaUrl } from "@/lib/api/public";
import { resolveHref } from "@/lib/href";
import { CalendarCard, type CalendarEvent } from "./CalendarCard";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;
interface Btn {
  label?: B;
  href?: string;
}

const card = "rounded-[10px] border border-black/15 bg-white shadow-[0_0_10px_rgba(0,0,0,0.08)]";
const ghost = "inline-flex items-center gap-2 rounded-full border-[0.6px] border-[#135130] px-4 py-1.5 text-[12px] text-[#135130] hover:bg-[#135130]/5";

/* ------------------------------------------------------------------ Announcements & Circulars */

const CAT_ICONS: { Icon: LucideIcon; fg: string }[] = [
  { Icon: Users, fg: "text-[#135130]" },
  { Icon: Users, fg: "text-[#f5871f]" },
  { Icon: FileText, fg: "text-[#1a62e0]" },
  { Icon: ScrollText, fg: "text-[#6a1b9a]" },
  { Icon: Megaphone, fg: "text-[#135130]" },
  { Icon: Calendar, fg: "text-[#e8202a]" },
];

/** `announce-categories`: six category shortcuts overlapping the hero. */
export function AnnounceCategoriesSection({ slug, locale, data }: SectionProps) {
  const d = data as { viewAll?: B; items?: { label?: B; href?: string }[] };
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[60px] lg:px-[62px]">
      <ul className="grid grid-cols-2 gap-y-4 rounded-[20px] bg-white px-4 py-5 shadow-[0_2px_16px_rgba(0,0,0,0.18)] sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-black/10">
        {(d.items ?? []).map((it, i) => {
          const { Icon, fg } = CAT_ICONS[i % CAT_ICONS.length]!;
          return (
            <li key={i}>
              <Link href={resolveHref(it.href ?? "page:announcements", slug)} className="flex flex-col items-center gap-1 py-1 text-center">
                <Icon className={`size-9 ${fg}`} strokeWidth={1.8} aria-hidden />
                <span className="text-[18px] leading-6 font-semibold text-black">{pickText(it.label, locale)}</span>
                <span className="text-[11px] text-[#414141]">{pickText(d.viewAll, locale)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const ROW_ICONS: { Icon: LucideIcon; bg: string; fg: string }[] = [
  { Icon: Landmark, bg: "bg-[#e3f1e9]", fg: "text-[#135130]" },
  { Icon: Stethoscope, bg: "bg-[#fdeedd]", fg: "text-[#f5871f]" },
  { Icon: FileText, bg: "bg-[#e2edfa]", fg: "text-[#1a62e0]" },
  { Icon: ScrollText, bg: "bg-[#efe6f8]", fg: "text-[#6a1b9a]" },
  { Icon: Users, bg: "bg-[#fdeedd]", fg: "text-[#f5871f]" },
];

/** `announce-feed`: latest announcements (published ones when present) beside the interactive calendar. */
export async function AnnounceFeedSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as {
    heading?: B;
    calendarTitle?: B;
    viewAll?: Btn;
    viewAllLong?: B;
    newLabel?: B;
    items?: { title?: B; body?: B; date?: B }[];
    events?: { date: string; title?: B; time?: string; color?: string }[];
  };
  const live = await listPublicAnnouncements(slug, { limit: 8 }).catch(() => null);
  const fmt = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
  const rows =
    live && live.data.length > 0
      ? live.data.map((a) => ({
          title: pickText(pair(a.titleEn, a.titleMr), locale),
          body: pickText(pair(a.bodyEn, a.bodyMr), locale),
          date: a.publishedAt ? fmt.format(new Date(a.publishedAt)) : "",
          isNew: a.publishedAt ? new Date().getTime() - new Date(a.publishedAt).getTime() < 7 * 24 * 3600 * 1000 : false,
          href: a.attachmentId ? publicMediaUrl(slug, a.attachmentId) : undefined,
        }))
      : (d.items ?? []).map((a, i) => ({ title: pickText(a.title, locale), body: pickText(a.body, locale), date: pickText(a.date, locale), isNew: i < 2, href: undefined as string | undefined }));
  const events: CalendarEvent[] = (d.events ?? []).map((e) => ({ date: e.date, title: pickText(e.title, locale), time: e.time, color: e.color }));
  const weekdays = locale === "mr" ? ["र", "सो", "मं", "बु", "गु", "शु", "श"] : ["S", "M", "T", "W", "T", "F", "S"];
  const monthNames = Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "long" }).format(new Date(2026, m, 1)));
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-[62px]">
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold text-black">
              <Megaphone className="size-5 text-[#135130]" aria-hidden /> {pickText(d.heading, locale)}
            </h2>
            {d.viewAll?.href && (
              <Link href={resolveHref(d.viewAll.href, slug)} className={ghost}>
                {pickText(d.viewAll.label, locale)} <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            )}
          </div>
          <ul className="mt-4 rounded-[8px] border border-black/15">
            {rows.length === 0 && <li className="p-6 text-center text-sm text-[#414141]">{t("noAnnouncements")}</li>}
            {rows.map((r, i) => {
              const { Icon, bg, fg } = ROW_ICONS[i % ROW_ICONS.length]!;
              const body = (
                <>
                  <span aria-hidden className={`flex size-10 shrink-0 items-center justify-center rounded-[8px] ${bg} ${fg}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[14px] font-semibold text-black">{r.title}</span>
                    {r.body && <span className="mt-0.5 block text-[11px] text-[#414141]">{r.body}</span>}
                  </span>
                  <span className="shrink-0 text-right text-[11px] text-[#414141]">
                    {r.date}
                    {r.isNew && <span className="mt-1 ml-2 inline-block rounded-[3px] bg-[#ff2d3d] px-2 py-0.5 text-[10px] font-semibold text-white">{pickText(d.newLabel, locale) || t("newBadge")}</span>}
                  </span>
                </>
              );
              return (
                <li key={i} className="border-b border-black/10 last:border-b-0">
                  {r.href ? (
                    <a href={r.href} className="flex items-center gap-3 px-3 py-3 hover:bg-black/[0.02]">
                      {body}
                    </a>
                  ) : (
                    <div className="flex items-center gap-3 px-3 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          {d.viewAll?.href && (
            <div className="mt-4 flex justify-center">
              <Link href={resolveHref(d.viewAll.href, slug)} className={ghost}>
                {pickText(d.viewAllLong, locale) || pickText(d.viewAll.label, locale)}
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
  { bg: "bg-[#f1f3f1]", fg: "text-[#1b3a6b]", Icon: HandCoins },
  { bg: "bg-[#fdeedd]", fg: "text-[#f5871f]", Icon: Landmark },
  { bg: "bg-[#e2edfa]", fg: "text-[#1a62e0]", Icon: Stethoscope },
  { bg: "bg-[#efe6f8]", fg: "text-[#6a1b9a]", Icon: Users },
];

/** `deadlines-downloads`: "Important Deadlines" tiles beside the "Downloads" file list. */
export async function DeadlinesDownloadsSection({ slug, locale, data }: SectionProps) {
  const d = data as {
    deadlinesTitle?: B;
    downloadsTitle?: B;
    viewAll?: Btn;
    deadlines?: { date?: B; title?: B; caption?: B }[];
    files?: { name?: B; type?: string; size?: string }[];
  };
  const t = await getTranslations("public");
  return (
    <section className="bg-cream py-4">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)] lg:px-[62px]">
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold text-black">
              <Calendar className="size-5 text-[#e8202a]" aria-hidden /> {pickText(d.deadlinesTitle, locale)}
            </h2>
            {d.viewAll?.href && (
              <Link href={resolveHref(d.viewAll.href, slug)} className={ghost}>
                {pickText(d.viewAll.label, locale)}
              </Link>
            )}
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(d.deadlines ?? []).map((x, i) => {
              const s = DEADLINE_STYLE[i % DEADLINE_STYLE.length]!;
              return (
                <li key={i} className={`flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-[8px] px-3 py-5 text-center ${s.bg}`}>
                  <s.Icon className={`size-8 ${s.fg}`} strokeWidth={1.7} aria-hidden />
                  <p className={`text-[15px] font-semibold ${s.fg}`}>{pickText(x.date, locale)}</p>
                  <p className="text-[12px] leading-4 text-black">{pickText(x.title, locale)}</p>
                  <p className="text-[12px] leading-4 text-black">{pickText(x.caption, locale)}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <div className={`${card} p-5`}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[17px] font-semibold text-black">
              <Download className="size-5 text-[#135130]" aria-hidden /> {pickText(d.downloadsTitle, locale)}
            </h2>
            {d.viewAll?.href && (
              <Link href={resolveHref(d.viewAll.href, slug)} className={ghost}>
                {pickText(d.viewAll.label, locale)}
              </Link>
            )}
          </div>
          <ul className="mt-4 space-y-2">
            {(d.files ?? []).map((f, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[6px] border border-black/15 px-3 py-2 text-[12px]">
                <FileText className="size-4 shrink-0 text-[#e8202a]" aria-hidden />
                <span className="flex-1 font-medium text-black">{pickText(f.name, locale)}</span>
                <span className="text-[#414141]">
                  {f.type} · {f.size}
                </span>
                <Download className="size-4 text-[#135130]" aria-label={t("download")} />
              </li>
            ))}
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

/** `rts-grid`: "Right to Service (RTS) – Apply Online" certificate tiles with a portal button. */
export function RtsGridSection({ slug, locale, data }: SectionProps) {
  const d = data as { heading?: B; subheading?: B; items?: { label?: B; caption?: B; href?: string }[]; action?: { label?: B; href?: string } };
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-[1440px] px-4 sm:px-8 lg:-mt-[40px] lg:px-[62px]">
      <div className="rounded-[20px] bg-white px-5 py-6 shadow-[0_2px_16px_rgba(0,0,0,0.18)] sm:px-9">
        <h2 className="text-center text-[24px] leading-8 font-semibold text-black">{pickText(d.heading, locale)}</h2>
        <p className="mt-1 text-center text-[13px] text-[#414141]">{pickText(d.subheading, locale)}</p>
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {(d.items ?? []).map((it, i) => {
            const Icon = RTS_ICONS[i % RTS_ICONS.length]!;
            return (
              <li key={i}>
                <Link href={resolveHref(it.href ?? "page:grievance", slug)} className="flex min-h-[116px] flex-col items-center rounded-[8px] border border-black/15 bg-white px-2 py-4 text-center shadow-[0_0_8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5">
                  <span aria-hidden className="flex size-[36px] items-center justify-center rounded-[8px] bg-[#e3f1e9] text-[#135130]">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="mt-3 text-[13px] font-semibold text-black">{pickText(it.label, locale)}</span>
                  <span className="mt-1 text-[10px] text-[#414141]">{pickText(it.caption, locale)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {d.action?.href && (
          <div className="mt-6 flex justify-center">
            <Link href={resolveHref(d.action.href, slug)} className="inline-flex items-center gap-3 rounded-[8px] bg-[#135130] px-8 py-3 text-[14px] font-medium text-white hover:opacity-90">
              {pickText(d.action.label, locale)} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

const ACTION_STYLES = [
  { fg: "text-[#6a1b9a]", border: "border-[#6a1b9a]", bg: "bg-[#faf7fd]", Icon: ShieldCheck },
  { fg: "text-[#f5871f]", border: "border-[#f5871f]", bg: "bg-[#fffaf4]", Icon: Mail },
  { fg: "text-[#1a62e0]", border: "border-[#1a62e0]", bg: "bg-[#f6f9fe]", Icon: CreditCard },
  { fg: "text-[#135130]", border: "border-[#135130]", bg: "bg-[#f5faf7]", Icon: Search },
];

/** `action-cards`: four service cards (grievance, feedback, tax, status) with a coloured action button. */
export function ActionCardsSection({ slug, locale, data }: SectionProps) {
  const d = data as { items?: { title?: B; body?: B; bullets?: B[]; action?: B; href?: string }[] };
  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(d.items ?? []).map((it, i) => {
            const s = ACTION_STYLES[i % ACTION_STYLES.length]!;
            return (
              <li key={i} className={`flex flex-col rounded-[10px] border border-black/10 p-5 shadow-[0_0_10px_rgba(0,0,0,0.06)] ${s.bg}`}>
                <h3 className={`flex items-center gap-2 text-[14px] font-semibold ${s.fg}`}>
                  <s.Icon className="size-5" aria-hidden /> {pickText(it.title, locale)}
                </h3>
                <p className="mt-3 text-[16px] leading-6 text-black">{pickText(it.body, locale)}</p>
                <ul className="mt-4 space-y-2 text-[12px] text-black">
                  {(it.bullets ?? []).map((b, k) => (
                    <li key={k} className="flex items-center gap-2">
                      <span aria-hidden className={`size-1.5 rounded-full ${s.fg} bg-current`} />
                      {pickText(b, locale)}
                    </li>
                  ))}
                </ul>
                <Link href={resolveHref(it.href ?? "#", slug)} className={`mt-auto flex items-center justify-between rounded-[6px] border bg-white px-4 py-2.5 text-[13px] ${s.border} ${s.fg}`}>
                  <span className="mt-0">{pickText(it.action, locale)}</span> <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** `help-card`: "Need Help?" with contact details and common queries. */
export function HelpCardSection({ locale, data }: SectionProps) {
  const d = data as { heading?: B; body?: B; phone?: string; phoneHours?: B; email?: string; emailNote?: B; queriesTitle?: B; queries?: B[] };
  return (
    <section className="bg-cream py-6">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-[62px]">
        <div className={`${card} grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]`}>
          <div className="flex items-center gap-6">
            <span aria-hidden className="hidden size-[120px] shrink-0 items-center justify-center rounded-full bg-[#e3f1e9] text-[#135130] sm:flex">
              <CircleHelp className="size-14" strokeWidth={1.4} />
            </span>
            <div>
              <h2 className="text-[22px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
              <p className="mt-1 text-[13px] text-[#414141]">{pickText(d.body, locale)}</p>
              <p className="mt-4 flex items-start gap-3 text-[13px] text-black">
                <Phone className="mt-0.5 size-4 text-[#135130]" aria-hidden />
                <span>
                  <a href={`tel:${d.phone}`} className="font-semibold hover:underline">
                    {d.phone}
                  </a>
                  <span className="block text-[11px] text-[#414141]">{pickText(d.phoneHours, locale)}</span>
                </span>
              </p>
              <p className="mt-3 flex items-start gap-3 text-[13px] text-black">
                <Mail className="mt-0.5 size-4 text-[#135130]" aria-hidden />
                <span>
                  <a href={`mailto:${d.email}`} className="font-semibold hover:underline">
                    {d.email}
                  </a>
                  <span className="block text-[11px] text-[#414141]">{pickText(d.emailNote, locale)}</span>
                </span>
              </p>
            </div>
          </div>
          <div className="rounded-[8px] border border-black/15 p-4">
            <h3 className="text-[14px] font-semibold text-black">{pickText(d.queriesTitle, locale)}</h3>
            <ul className="mt-3 divide-y divide-black/10">
              {(d.queries ?? []).map((q, i) => (
                <li key={i} className="flex items-center justify-between py-2.5 text-[12px] text-black">
                  {pickText(q, locale)} <ArrowRight className="size-3.5" aria-hidden />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

