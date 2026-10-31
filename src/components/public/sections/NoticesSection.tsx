import { getTranslations } from "next-intl/server";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { listPublicAnnouncements, publicMediaUrl } from "@/lib/api/public";
import type { Bilingual as BL } from "@/i18n/text";
import { resolveHref } from "@/lib/href";
import { NoticeTabs, type NoticeRow, type NoticeTab } from "./NoticeTabs";
import type { SectionProps } from "./index";

interface NoticesData {
  heading?: Bilingual;
  subheading?: Bilingual;
  viewAll?: { href?: string };
  tabs?: { key?: string; label?: Bilingual; items?: { day?: string; monthYear?: string; title?: Bilingual; isNew?: boolean }[] }[];
  /** Published shape: notices with a category, filed under the tabs of `notice-categories`. */
  items?: { title?: BL; category?: string; publishedAt?: string; fileId?: string; buttonLink?: string; active?: boolean }[];
}

/**
 * `notices`: "Notice & Announcement" tabbed list (Figma 375:12300). The first tab shows the real
 * published announcements when the backend has any; otherwise the Figma placeholder rows.
 */
export async function NoticesSection({ slug, locale, data, siblings }: SectionProps) {
  const t = await getTranslations("public");
  const tc = await getTranslations("common");
  const d = data as NoticesData;
  const published = Array.isArray(d.items);
  let tabs: NoticeTab[] = (d.tabs ?? []).map((tab, i) => ({
    key: tab.key ?? String(i),
    label: pickText(tab.label, locale),
    items: (tab.items ?? []).map((n) => ({ day: n.day ?? "", monthYear: n.monthYear ?? "", title: pickText(n.title, locale), isNew: n.isNew })),
  }));
  if (published) {
    const day = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "2-digit" });
    const month = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "short", year: "numeric" });
    const rows = (d.items ?? [])
      .filter((x) => x.active !== false)
      .map((x) => {
        const when = x.publishedAt ? new Date(`${x.publishedAt}T00:00:00`) : null;
        return {
          category: x.category ?? "",
          row: {
            day: when ? day.format(when) : "",
            monthYear: when ? month.format(when) : "",
            title: pickText(x.title, locale),
            isNew: when ? new Date().getTime() - when.getTime() < 7 * 24 * 3600 * 1000 : false,
            href: x.fileId ? publicMediaUrl(slug, x.fileId) : x.buttonLink ? resolveHref(x.buttonLink, slug) : undefined,
          } as NoticeRow,
        };
      });
    const cats = ((siblings?.["notice-categories"] as { items?: { key?: string; label?: Bilingual }[] } | undefined)?.items ?? []).map((c) => ({ key: c.key ?? "", label: pickText(c.label, locale), en: pickText(c.label, "en") }));
    const names = cats.length > 0 ? cats : Array.from(new Set(rows.map((r) => r.category))).map((c) => ({ key: c, label: c, en: c }));
    tabs = names.map((c) => ({ key: c.key || c.label, label: c.label, items: rows.filter((r) => [c.key, c.label, c.en].filter(Boolean).includes(r.category)).map((r) => r.row) }));
  }
  if (tabs.length === 0) return null;

  const live = published ? null : await listPublicAnnouncements(slug, { limit: 5 }).catch(() => null);
  if (live && live.data.length > 0) {
    const fmt = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "2-digit" });
    const fmtMonth = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { month: "short", year: "numeric" });
    const rows: NoticeRow[] = live.data.map((a) => {
      const when = a.publishedAt ? new Date(a.publishedAt) : null;
      return {
        day: when ? fmt.format(when) : "",
        monthYear: when ? fmtMonth.format(when) : "",
        title: pickText(pair(a.titleEn, a.titleMr), locale),
        isNew: when ? new Date().getTime() - when.getTime() < 7 * 24 * 3600 * 1000 : false,
        href: a.attachmentId ? publicMediaUrl(slug, a.attachmentId) : undefined,
      };
    });
    tabs[0] = { key: tabs[0]!.key, label: tabs[0]!.label, items: rows };
  }

  return (
    <section className="bg-cream py-8">
      <div className="mx-auto max-w-[1377px] px-4 sm:px-8">
        <div className="text-center">
          <h2 className="text-[30px] leading-[45px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
          {pickText(d.subheading, locale) && <p className="mt-3 text-[20px] leading-[30px] text-black">{pickText(d.subheading, locale)}</p>}
        </div>
        <div className="mx-auto mt-8 max-w-[1350px]">
          <NoticeTabs
            tabs={tabs}
            downloadLabel={t("download")}
            viewAllLabel={tc("viewAll")}
            viewAllHref={d.viewAll?.href ? resolveHref(d.viewAll.href, slug) : undefined}
            emptyLabel={t("noAnnouncements")}
            newLabel={t("newBadge")}
          />
        </div>
      </div>
    </section>
  );
}
