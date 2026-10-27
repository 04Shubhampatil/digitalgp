import { ExternalLink } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { listPublicSchemes } from "@/lib/api/public";

/** Published schemes (GET /public/:slug/schemes) — Figma "Featured schemes" cards + category counts. */
export async function PublicSchemes({ slug, locale }: { slug: string; locale: UiLocale }) {
  const t = await getTranslations("public");
  const res = await listPublicSchemes(slug, { limit: 100 }).catch(() => null);
  const items = res?.data ?? [];
  if (items.length === 0) return <p className="rounded-card border border-line bg-surface p-6 text-center text-muted">{t("noSchemes")}</p>;

  const byLevel = { CENTRAL: 0, STATE: 0, DISTRICT: 0, GRAM_PANCHAYAT: 0 } as Record<string, number>;
  for (const s of items) byLevel[s.level] = (byLevel[s.level] ?? 0) + 1;
  const fmt = new Intl.NumberFormat(locale === "mr" ? "mr-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div className="grid gap-8">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["CENTRAL", "STATE", "DISTRICT", "GRAM_PANCHAYAT"] as const).map((lvl) => (
          <div key={lvl} className="rounded-card border border-line bg-surface p-4 text-center">
            <dd className="text-2xl font-bold text-primary">{byLevel[lvl] ?? 0}</dd>
            <dt className="mt-1 text-xs text-muted">{t(`schemeLevel.${lvl}`)}</dt>
          </div>
        ))}
      </dl>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <li key={s.id} className="flex flex-col rounded-card border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="rounded-pill bg-success-soft px-2.5 py-1 text-success">{t(`schemeLevel.${s.level}`)}</span>
              {s.isShared && <span className="rounded-pill bg-info-soft px-2.5 py-1 text-info">{t("sharedScheme")}</span>}
            </div>
            <h3 className="mt-3 text-lg font-bold text-ink">{pickText(pair(s.nameEn, s.nameMr), locale)}</h3>
            <p className="mt-2 line-clamp-4 text-sm text-muted">{pickText(pair(s.descriptionEn, s.descriptionMr), locale)}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {s.beneficiaryCount !== null && (
                <div>
                  <dt className="text-muted">{t("beneficiaries")}</dt>
                  <dd className="font-semibold text-ink">{s.beneficiaryCount.toLocaleString("en-IN")}</dd>
                </div>
              )}
              {s.amountDisbursed && (
                <div>
                  <dt className="text-muted">{t("amountDisbursed")}</dt>
                  <dd className="font-semibold text-ink">{fmt.format(Number(s.amountDisbursed))}</dd>
                </div>
              )}
            </dl>
            {pickText(pair(s.eligibilityEn, s.eligibilityMr), locale) && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-primary">{t("eligibility")}</summary>
                <p className="mt-1 whitespace-pre-line text-muted">{pickText(pair(s.eligibilityEn, s.eligibilityMr), locale)}</p>
                {pickText(pair(s.processEn, s.processMr), locale) && (
                  <>
                    <p className="mt-2 font-semibold text-ink">{t("howToApply")}</p>
                    <p className="mt-1 whitespace-pre-line text-muted">{pickText(pair(s.processEn, s.processMr), locale)}</p>
                  </>
                )}
              </details>
            )}
            {s.externalUrl && (
              <a href={s.externalUrl} target="_blank" rel="noopener" className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-primary hover:underline">
                {t("applyOnline")} <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
