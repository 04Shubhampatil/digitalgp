import type { Metadata } from "next";
import { CalendarDays, Download, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { getPublicAnnouncement, publicMediaUrl } from "@/lib/api/public";
import { loadTenant } from "@/lib/public-tenant";
import { Chip, DetailBody, DetailCard, DetailHero, Facts, Prose, fmtBytes, fmtDate, loadOr404, pillPrimary } from "../../_detail/DetailKit";

type Params = Promise<{ tenant: string; announcementId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { tenant: slug, announcementId } = await params;
  const [a, locale] = await Promise.all([getPublicAnnouncement(slug, announcementId).catch(() => null), getLocale()]);
  return a ? { title: pickText(pair(a.titleEn, a.titleMr), locale as UiLocale) || undefined } : {};
}

const PRIORITY_TONE = { NORMAL: "grey", IMPORTANT: "blue", URGENT: "orange", EMERGENCY: "red" } as const;

/** Public announcement page (notice rows, Latest Announcements, What's New): GET /public/:slug/announcements/:id. */
export default async function AnnouncementDetailPage({ params }: { params: Params }) {
  const { tenant: slug, announcementId } = await params;
  const [, locale, t, td] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public"), getTranslations("public.detail")]);
  const ui = locale as UiLocale;
  const a = await loadOr404(() => getPublicAnnouncement(slug, announcementId));

  const title = pickText(pair(a.titleEn, a.titleMr), ui);
  const body = pickText(pair(a.bodyEn, a.bodyMr), ui);
  const venue = pickText(pair(a.eventLocationEn, a.eventLocationMr), ui);
  const listHref = pageHref(slug, "announcements");
  const back = { href: `${listHref}#live-announcements`, label: td("back", { page: t("announcements") }) };
  const when = a.eventStartAt ? [fmtDate(ui, a.eventStartAt, true), a.eventEndAt ? fmtDate(ui, a.eventEndAt, true) : ""].filter(Boolean).join(" – ") : "";
  const file = a.attachment ?? (a.attachmentId ? { id: a.attachmentId, name: td("attachment"), sizeBytes: 0, mimeType: "", kind: "DOCUMENT" as const } : null);
  const fileUrl = file ? publicMediaUrl(slug, file.id) : null;
  const ext = file?.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : file?.mimeType.split("/").pop()?.toUpperCase();
  const isImage = file?.kind === "IMAGE";

  return (
    <main>
      <DetailHero
        eyebrow={t("announcements")}
        title={title}
        back={back}
        chips={
          <>
            <Link href={`${listHref}?category=${encodeURIComponent(a.category)}#live-announcements`} className="hover:opacity-80">
              <Chip>{a.category}</Chip>
            </Link>
            {a.priority !== "NORMAL" && <Chip tone={PRIORITY_TONE[a.priority]}>{td(`priority.${a.priority}`)}</Chip>}
            {a.eventStartAt && (
              <Chip tone="blue">
                <CalendarDays className="size-3.5" aria-hidden /> {td("event")}
              </Chip>
            )}
            {a.publishedAt && <span className="text-[13px] text-[#414141]">{td("publishedOn", { date: fmtDate(ui, a.publishedAt) })}</span>}
          </>
        }
      />
      <DetailBody
        main={
          <>
            <DetailCard>{body ? <Prose text={body} /> : <p className="text-[15px] leading-[26px] text-[#414141]">{title}</p>}</DetailCard>
            {isImage && fileUrl && (
              <DetailCard>
                {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
                <img src={fileUrl} alt="" className="h-auto w-full rounded-[10px]" loading="lazy" />
              </DetailCard>
            )}
          </>
        }
        side={
          <>
            {a.eventStartAt && (
              <DetailCard title={td("event")} tone="green">
                <Facts
                  tone="green"
                  stacked
                  rows={[
                    {
                      label: td("eventDate"),
                      value: (
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="size-4 shrink-0" aria-hidden /> {when}
                        </span>
                      ),
                    },
                    {
                      label: td("eventVenue"),
                      value: venue ? (
                        <span className="inline-flex items-center gap-2">
                          <MapPin className="size-4 shrink-0" aria-hidden /> {venue}
                        </span>
                      ) : (
                        ""
                      ),
                    },
                  ]}
                />
              </DetailCard>
            )}
            {file && fileUrl && (
              <DetailCard title={td("attachment")}>
                <a href={fileUrl} download className="flex items-center gap-4 rounded-[8px] border border-black/15 px-4 py-3.5 hover:bg-black/[0.02]">
                  <FileText className="size-6 shrink-0 text-[#e8202a]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-black">{file.name}</span>
                    <span className="block text-[12px] text-[#555]">{[ext, fmtBytes(file.sizeBytes)].filter(Boolean).join(" • ")}</span>
                  </span>
                  <Download className="size-5 shrink-0 text-[#135130]" aria-hidden />
                </a>
                <a href={fileUrl} download className={`${pillPrimary} mt-4 w-full`}>
                  <Download className="size-4" aria-hidden /> {t("download")}
                  {fmtBytes(file.sizeBytes) && ` (${fmtBytes(file.sizeBytes)})`}
                </a>
              </DetailCard>
            )}
            <DetailCard>
              <Facts
                rows={[
                  { label: td("category"), value: a.category },
                  { label: td("published"), value: fmtDate(ui, a.publishedAt) },
                  { label: td("validUntil"), value: fmtDate(ui, a.expiresAt) },
                ]}
              />
            </DetailCard>
          </>
        }
      />
    </main>
  );
}
