import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PUBLIC_NAV, pageHref } from "@/config/public-nav";
import { loadTenant } from "@/lib/public-tenant";

export const metadata: Metadata = { title: "Sitemap" };

/** Circular rule 7: a content index of every page on the website. */
export default async function SitemapPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = await params;
  const [, t] = await Promise.all([loadTenant(slug), getTranslations("public")]);
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">{t("sitemap")}</h1>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {PUBLIC_NAV.map((g, i) => (
          <section key={i}>
            {g.labelKey && <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t(`nav.${g.labelKey}`)}</h2>}
            <ul className="grid gap-1.5">
              {g.pages.map((p) => (
                <li key={p}>
                  <Link href={pageHref(slug, p)} className="text-primary hover:underline">
                    {t(p)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section>
          <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{t("more")}</h2>
          <ul className="grid gap-1.5">
            <li>
              <Link href={`/${slug}/search`} className="text-primary hover:underline">
                {t("searchTitle")}
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
