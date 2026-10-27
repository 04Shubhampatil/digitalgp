import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { DEFAULT_PAGE_KEYS, type PageKey } from "@/config/pages";
import { pageHref } from "@/config/public-nav";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { getPublicPage, listPublicAnnouncements, listPublicProjects, listPublicSchemes } from "@/lib/api/public";
import { loadTenant } from "@/lib/public-tenant";

export const metadata: Metadata = { title: "Search" };

interface Hit {
  href: string;
  title: string;
  snippet: string;
  kind: string;
}

/** Flatten any JSON value to text for matching. */
function textOf(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(textOf).join(" ");
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).map(textOf).join(" ");
  return "";
}

function snippet(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, i - 60);
  return (start > 0 ? "…" : "") + text.slice(start, start + 160).replace(/\s+/g, " ") + (text.length > start + 160 ? "…" : "");
}

/**
 * Circular rule 8: keyword search. There is no search endpoint yet, so this searches the
 * published pages, announcements, schemes and projects of the website (all cached public reads).
 */
export default async function SearchPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ q?: string }> }) {
  const [{ tenant: slug }, { q = "" }] = await Promise.all([params, searchParams]);
  const [, locale, t] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public")]);
  const ui = locale as UiLocale;
  const query = q.trim();
  let hits: Hit[] = [];

  if (query.length >= 2) {
    const needle = query.toLowerCase();
    const pages = await Promise.all(DEFAULT_PAGE_KEYS.map((k) => getPublicPage(slug, k).then((p) => [k, p] as const).catch(() => null)));
    for (const entry of pages) {
      if (!entry) continue;
      const [key, page] = entry;
      const text = page.sections.map((s) => textOf(s.data)).join(" ");
      if (text.toLowerCase().includes(needle)) hits.push({ href: pageHref(slug, key as PageKey), title: t(key), snippet: snippet(text, query), kind: t("searchKinds.page") });
    }
    const [ann, sch, prj] = await Promise.all([
      listPublicAnnouncements(slug, { limit: 100 }).catch(() => null),
      listPublicSchemes(slug, { limit: 100 }).catch(() => null),
      listPublicProjects(slug, { limit: 100 }).catch(() => null),
    ]);
    for (const a of ann?.data ?? []) {
      const text = [a.titleEn, a.titleMr, a.bodyEn, a.bodyMr, a.category].filter(Boolean).join(" ");
      if (text.toLowerCase().includes(needle)) hits.push({ href: pageHref(slug, "announcements"), title: pickText(pair(a.titleEn, a.titleMr), ui), snippet: snippet(text, query), kind: t("announcements") });
    }
    for (const s of sch?.data ?? []) {
      const text = [s.nameEn, s.nameMr, s.descriptionEn, s.descriptionMr, s.eligibilityEn, s.eligibilityMr].filter(Boolean).join(" ");
      if (text.toLowerCase().includes(needle)) hits.push({ href: pageHref(slug, "schemes"), title: pickText(pair(s.nameEn, s.nameMr), ui), snippet: snippet(text, query), kind: t("schemes") });
    }
    for (const p of prj?.data ?? []) {
      const text = [p.nameEn, p.nameMr, p.descriptionEn, p.descriptionMr, p.outcomeEn, p.outcomeMr].filter(Boolean).join(" ");
      if (text.toLowerCase().includes(needle)) hits.push({ href: pageHref(slug, "projects"), title: pickText(pair(p.nameEn, p.nameMr), ui), snippet: snippet(text, query), kind: t("projects") });
    }
    hits = hits.slice(0, 50);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">{t("searchTitle")}</h1>
      <form action={`/${slug}/search`} method="get" className="mt-6 flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t("searchTitle")}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input type="search" name="q" defaultValue={query} minLength={2} placeholder={t("searchPlaceholder")} className="h-12 w-full rounded-card border border-line bg-surface pr-3 pl-10 text-base outline-none focus:border-primary" />
        </label>
        <button type="submit" className="rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
          {t("searchTitle")}
        </button>
      </form>

      {query.length >= 2 && (
        <p className="mt-6 text-sm text-muted">{t("searchResults", { count: hits.length, query })}</p>
      )}
      <ul className="mt-4 grid gap-3">
        {hits.map((h, i) => (
          <li key={i} className="rounded-card border border-line bg-surface p-4">
            <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{h.kind}</p>
            <Link href={h.href} className="text-lg font-bold text-primary hover:underline">
              {h.title}
            </Link>
            <p className="mt-1 text-sm text-muted">{h.snippet}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
