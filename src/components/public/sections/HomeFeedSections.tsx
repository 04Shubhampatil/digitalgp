import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pair, pickText, type Bilingual } from "@/i18n/text";
import { pageHref } from "@/config/public-nav";
import { listPublicAnnouncements, publicMediaUrl } from "@/lib/api/public";
import { detailHref, resolveHref } from "@/lib/href";
import { AchievementsCard } from "./HomeFeed";
import type { SectionProps } from "./index";

type B = Bilingual | undefined;

/** `achievements`: "Top Five Achievements of the Ward" (Figma 375:13333). */
export async function AchievementsSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  // Published data: { title, description, completedOn, rank }; the design placeholder used { body, completed, ward }.
  const d = data as { heading?: B; wards?: B[]; items?: { title?: B; body?: B; description?: B; completed?: B; completedOn?: string; ward?: B }[] };
  const items = (d.items ?? []).map((a) => ({
    title: pickText(a.title, locale),
    body: pickText(a.body ?? a.description, locale),
    completed: a.completedOn ?? pickText(a.completed, locale),
    ward: pickText(a.ward, locale) || undefined,
  }));
  if (items.length === 0) return null;
  return <AchievementsCard heading={pickText(d.heading, locale)} selectLabel={t("selectWard")} allLabel={t("allWards")} wards={(d.wards ?? []).map((w) => pickText(w, locale))} items={items} href={pageHref(slug, "progress")} />;
}

const CHIP: Record<string, string> = {
  completed: "bg-[#dcefdc] text-[#135130]",
  event: "bg-[#dce9ff] text-[#1a62e0]",
  ongoing: "bg-[#fff0dc] text-[#f5871f]",
};

type NewsItem = { title?: B; date?: B | string; status?: string; imageUrl?: string; href?: string };

/**
 * `whats-new`: "What's New This Week?" list with thumbnails and status chips (Figma 375:13391). Each row opens its
 * `href` (published items) or the list. The placeholder (`source: "announcements"`) shows the published announcements
 * meant for the home page instead of its sample rows; each opens its announcement page.
 */
export async function WhatsNewSection({ slug, locale, data }: SectionProps) {
  const t = await getTranslations("public");
  const d = data as { heading?: B; source?: "announcements"; viewAll?: { label?: B; href?: string }; items?: NewsItem[] };
  let items: NewsItem[] = d.items ?? [];
  if (d.source === "announcements") {
    const live = await listPublicAnnouncements(slug, { page: "home", limit: 5 }).catch(() => null);
    if (live && live.data.length > 0) {
      const fmt = new Intl.DateTimeFormat(locale === "mr" ? "mr-IN" : "en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
      // The design pictures belong to the sample rows; a published row keeps the picture of the sample with the same title.
      const pictures = new Map(items.map((i) => [pickText(i.title, "en").toLowerCase(), i.imageUrl]));
      items = live.data.map((a) => {
        const title = pair(a.titleEn, a.titleMr);
        const status = a.category.trim().toLowerCase();
        return {
          title,
          date: a.publishedAt ? fmt.format(new Date(a.publishedAt)) : "",
          status: status in CHIP ? status : a.category,
          imageUrl: a.attachment?.kind === "IMAGE" ? publicMediaUrl(slug, a.attachment.id) : pictures.get(pickText(title, "en").toLowerCase()),
          href: detailHref(slug, "announcements", a.id),
        };
      });
    }
  }
  if (items.length === 0) return null;
  return (
    <div className="rounded-[10px] border border-black/15 bg-white p-3">
      <div className="flex items-center justify-between px-2 py-1.5">
        <h2 className="text-[20px] leading-[27px] font-semibold text-black">{pickText(d.heading, locale)}</h2>
        {d.viewAll?.href && (
          <Link href={resolveHref(d.viewAll.href, slug)} className="rounded-full border-[0.6px] border-[#135130] px-4 py-1.5 text-[13.5px] text-[#135130] hover:bg-[#135130]/5">
            {pickText(d.viewAll.label, locale) || t("viewAll")}
          </Link>
        )}
      </div>
      <ul className="mt-2 rounded-[10px] border border-black/15">
        {items.map((n, i) => (
          <li key={i} className="border-b border-black last:border-b-0">
            <Link href={n.href ? resolveHref(n.href, slug) : d.viewAll?.href ? resolveHref(d.viewAll.href, slug) : pageHref(slug, "announcements")} className="flex items-center gap-4 px-3 py-3 hover:bg-[#f4faf6]">
            {n.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- static design asset / backend media
              <img src={n.imageUrl} alt="" width={92} height={68} className="h-[68px] w-[92px] shrink-0 rounded-[10px] object-cover" loading="lazy" />
            )}
            <div>
              <p className="text-[16px] leading-[24px] font-semibold text-black">{pickText(n.title, locale)}</p>
              <p className="mt-2 flex items-center gap-4 text-[12px] text-black">
                {typeof n.date === "string" ? n.date : pickText(n.date, locale)}
                {n.status && (
                  <span className={`rounded-full px-3 py-1 text-[12px] ${CHIP[n.status] ?? "bg-[#ececec] text-[#414141]"}`}>{n.status in CHIP ? t(`status.${n.status}`) : n.status}</span>
                )}
              </p>
            </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
