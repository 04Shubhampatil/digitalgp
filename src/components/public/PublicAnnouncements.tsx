import { getTranslations } from "next-intl/server";
import type { PageKey } from "@/config/pages";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { listPublicAnnouncements, publicMediaUrl } from "@/lib/api/public";
import { formatDate } from "@/lib/format";
import { StatusPill } from "@/components/ui/StatusPill";

/** Published announcements for a page (GET /public/:slug/announcements?page=). */
export async function PublicAnnouncements({ slug, locale, page, limit = 20, compact = false }: { slug: string; locale: UiLocale; page: PageKey; limit?: number; compact?: boolean }) {
  const t = await getTranslations("public");
  const ta = await getTranslations("admin");
  const res = await listPublicAnnouncements(slug, { page, limit }).catch(() => null);
  const items = res?.data ?? [];
  if (items.length === 0) {
    return compact ? null : <p className="rounded-card border border-line bg-surface p-6 text-center text-muted">{t("noAnnouncements")}</p>;
  }
  return (
    <ul className="grid gap-3">
      {items.map((a) => (
        <li key={a.id} className="rounded-card border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={a.priority} label={ta(`announcements.priorityLabel.${a.priority}`)} />
            {a.isShared && <span className="rounded-pill bg-info-soft px-3 py-1 text-[11px] font-semibold text-info">{ta("announcements.isShared")}</span>}
            <span className="text-xs text-muted">
              {a.category} · {formatDate(a.publishedAt, locale)}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold text-ink">{pickText(pair(a.titleEn, a.titleMr), locale)}</h3>
          {!compact && pickText(pair(a.bodyEn, a.bodyMr), locale) && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted">{pickText(pair(a.bodyEn, a.bodyMr), locale)}</p>}
          {a.attachmentId && (
            <a href={publicMediaUrl(slug, a.attachmentId)} target="_blank" rel="noopener" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
              {t("downloadAttachment")}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
