import { getTranslations } from "next-intl/server";
import type { ProjectStage } from "@/types/api";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { listPublicProjects, publicMediaUrl } from "@/lib/api/public";

const STAGES: ProjectStage[] = ["ONGOING", "COMPLETED", "UPCOMING"];

/** Published projects grouped by stage (GET /public/:slug/projects) — Figma "Key Projects" tabs/cards. */
export async function PublicProjects({ slug, locale }: { slug: string; locale: UiLocale }) {
  const t = await getTranslations("public");
  const res = await listPublicProjects(slug, { limit: 100 }).catch(() => null);
  const items = res?.data ?? [];
  if (items.length === 0) return <p className="rounded-card border border-line bg-surface p-6 text-center text-muted">{t("noProjects")}</p>;
  const fmt = new Intl.NumberFormat(locale === "mr" ? "mr-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  return (
    <div className="grid gap-10">
      {STAGES.map((stage) => {
        const group = items.filter((p) => p.stage === stage);
        if (group.length === 0) return null;
        return (
          <section key={stage}>
            <h3 className="mb-4 text-xl font-bold text-ink">
              {t(`projectStage.${stage}`)} <span className="text-sm font-normal text-muted">({group.length})</span>
            </h3>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-card border border-line bg-surface">
                  {p.coverImageId && (
                    // eslint-disable-next-line @next/next/no-img-element -- backend-served media
                    <img src={publicMediaUrl(slug, p.coverImageId)} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                  )}
                  <div className="p-5">
                    <h4 className="text-lg font-bold text-ink">{pickText(pair(p.nameEn, p.nameMr), locale)}</h4>
                    <p className="mt-1 text-xs text-muted">
                      {[p.year, p.wardNo ? `${t("ward")} ${p.wardNo}` : null].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-muted">{pickText(pair(p.descriptionEn, p.descriptionMr), locale)}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      {p.budget && (
                        <div>
                          <dt className="text-muted">{t("budget")}</dt>
                          <dd className="font-semibold text-ink">{fmt.format(Number(p.budget))}</dd>
                        </div>
                      )}
                      {p.familiesBenefited !== null && (
                        <div>
                          <dt className="text-muted">{t("familiesBenefited")}</dt>
                          <dd className="font-semibold text-ink">{p.familiesBenefited.toLocaleString("en-IN")}</dd>
                        </div>
                      )}
                    </dl>
                    {pickText(pair(p.outcomeEn, p.outcomeMr), locale) && (
                      <p className="mt-3 rounded-input bg-success-soft px-3 py-2 text-xs text-success">
                        <span className="font-semibold">{t("outcome")}: </span>
                        {pickText(pair(p.outcomeEn, p.outcomeMr), locale)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
