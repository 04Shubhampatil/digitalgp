import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { DEFAULT_PAGE_KEYS, type PageKey } from "@/config/pages";
import { pageHref } from "@/config/public-nav";
import { withFallback } from "@/content/fallback";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { getPublicPage, listPublicAnnouncements, listPublicProjects, listPublicSchemes, listPublicSuccessStories } from "@/lib/api/public";
import { detailHref } from "@/lib/href";
import { loadTenant } from "@/lib/public-tenant";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Search" };

type Kind = "page" | "announcement" | "scheme" | "project" | "story";
const KINDS: Kind[] = ["page", "announcement", "scheme", "project", "story"];

interface Hit {
  href: string;
  title: string;
  context?: string;
  text: string;
  kind: Kind;
  score: number;
}

/** Keys whose values are links, ids, icons or styling, not text a visitor reads. */
const SKIP_KEYS = /^(href|link|url|.*Url|.*Id|.*Ids|icon|colour|color|tone|variant|layout|key|.*Key|sortOrder|order|status|enabled|active|visible|geometry|source|live|format|background|accent)$/;

/** Visible text of a section, in both languages. */
function textOf(v: unknown, key = ""): string {
  if (v == null || SKIP_KEYS.test(key)) return "";
  if (typeof v === "string") return /^(\/|https?:|page:|#|data:)/.test(v) ? "" : v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map((x) => textOf(x)).join(" ");
  if (typeof v === "object") return Object.entries(v as Record<string, unknown>).map(([k, x]) => textOf(x, k)).join(" ");
  return "";
}

const norm = (s: string) => s.toLowerCase().normalize("NFC");

/** Every word of the query must appear; title matches rank higher. 0 = no match. */
function score(words: string[], title: string, text: string): number {
  const t = norm(title);
  const all = `${t} ${norm(text)}`;
  if (!words.every((w) => all.includes(w))) return 0;
  return words.reduce((n, w) => n + (t.includes(w) ? 3 : 1), 0);
}

/** ~180 characters around the first match. */
function snippet(text: string, words: string[]): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const low = norm(clean);
  const at = Math.max(0, Math.min(...words.map((w) => low.indexOf(w)).filter((i) => i >= 0), clean.length));
  const start = Math.max(0, at - 70);
  return (start > 0 ? "…" : "") + clean.slice(start, start + 180) + (clean.length > start + 180 ? "…" : "");
}

/** Highlight the query words inside a string. */
function Marked({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[2px] bg-[#fff1c2] px-0.5 text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * Website search (Figma has no frame; built in the site's style): searches everything the pages show (published
 * sections, or the design content while a page is not published yet), announcements, schemes, projects and success
 * stories, in English and Marathi. Every word must match; results link to the exact section or record.
 */
export default async function SearchPage({ params, searchParams }: { params: Promise<{ tenant: string }>; searchParams: Promise<{ q?: string; type?: string }> }) {
  const [{ tenant: slug }, { q = "", type }] = await Promise.all([params, searchParams]);
  const [, locale, t] = await Promise.all([loadTenant(slug), getLocale(), getTranslations("public")]);
  const ui = locale as UiLocale;
  const query = q.trim().slice(0, 100);
  const words = norm(query).split(/\s+/).filter((w) => w.length >= 2);
  const kindFilter = KINDS.includes(type as Kind) ? (type as Kind) : null;
  let hits: Hit[] = [];

  if (words.length > 0) {
    const [pages, ann, sch, prj, stories] = await Promise.all([
      Promise.all(DEFAULT_PAGE_KEYS.map((k) => getPublicPage(slug, k).then((p) => [k, p] as const).catch(() => [k, null] as const))),
      listPublicAnnouncements(slug, { limit: 100 }).catch(() => null),
      listPublicSchemes(slug, { limit: 100 }).catch(() => null),
      listPublicProjects(slug, { limit: 100 }).catch(() => null),
      listPublicSuccessStories(slug, { limit: 100 }).catch(() => null),
    ]);

    for (const [key, page] of pages) {
      const pageKey = key as PageKey;
      const pageName = t(pageKey);
      const shown = withFallback(pageKey, page);
      // The page itself (its name in both languages).
      const nameScore = score(words, `${pageName} ${t.has(pageKey) ? pageKey : ""}`, "");
      if (nameScore) hits.push({ href: pageHref(slug, pageKey), title: pageName, text: "", kind: "page", score: nameScore + 5 });
      // Each section separately, so the result jumps to the matching block.
      for (const s of shown.sections) {
        const data = s.data as Record<string, unknown>;
        const heading = pickText(data.heading as never, ui) || pickText(data.title as never, ui);
        const text = textOf(data);
        const sc = score(words, heading, text);
        if (!sc) continue;
        hits.push({ href: `${pageHref(slug, pageKey)}#${s.sectionKey}`, title: heading || pageName, context: heading ? pageName : undefined, text, kind: "page", score: sc });
      }
    }
    for (const a of ann?.data ?? []) {
      const title = pickText(pair(a.titleEn, a.titleMr), ui);
      const text = [a.titleEn, a.titleMr, a.bodyEn, a.bodyMr, a.category].filter(Boolean).join(" ");
      const sc = score(words, title, text);
      if (sc) hits.push({ href: detailHref(slug, "announcements", a.id), title, context: a.category, text: pickText(pair(a.bodyEn, a.bodyMr), ui) || text, kind: "announcement", score: sc });
    }
    for (const s of sch?.data ?? []) {
      const title = pickText(pair(s.nameEn, s.nameMr), ui);
      const text = [s.nameEn, s.nameMr, s.descriptionEn, s.descriptionMr, s.eligibilityEn, s.eligibilityMr, s.category].filter(Boolean).join(" ");
      const sc = score(words, title, text);
      if (sc) hits.push({ href: detailHref(slug, "schemes", s.id), title, context: s.category ?? undefined, text: pickText(pair(s.descriptionEn, s.descriptionMr), ui) || text, kind: "scheme", score: sc });
    }
    for (const p of prj?.data ?? []) {
      const title = pickText(pair(p.nameEn, p.nameMr), ui);
      const text = [p.nameEn, p.nameMr, p.descriptionEn, p.descriptionMr, p.outcomeEn, p.outcomeMr].filter(Boolean).join(" ");
      const sc = score(words, title, text);
      if (sc) hits.push({ href: detailHref(slug, "projects", p.id), title, text: pickText(pair(p.descriptionEn, p.descriptionMr), ui) || text, kind: "project", score: sc });
    }
    for (const st of stories?.data ?? []) {
      const title = pickText(pair(st.titleEn, st.titleMr), ui);
      const text = [st.titleEn, st.titleMr, st.summaryEn, st.summaryMr, st.bodyEn, st.bodyMr, st.quoteEn, st.quoteMr, st.personName, st.location].filter(Boolean).join(" ");
      const sc = score(words, title, text);
      if (sc) hits.push({ href: detailHref(slug, "success-stories", st.id), title, context: st.personName ?? undefined, text: pickText(pair(st.summaryEn, st.summaryMr), ui) || text, kind: "story", score: sc });
    }
    // One result per link, best first.
    const seen = new Set<string>();
    hits = hits.sort((a, b) => b.score - a.score).filter((h) => (seen.has(h.href) ? false : (seen.add(h.href), true)));
  }

  const counts = Object.fromEntries(KINDS.map((k) => [k, hits.filter((h) => h.kind === k).length])) as Record<Kind, number>;
  const shown = (kindFilter ? hits.filter((h) => h.kind === kindFilter) : hits).slice(0, 60);
  const kindLabel = (k: Kind) => t(`searchKinds.${k}`);
  const href = (k: Kind | null) => `/${slug}/search?q=${encodeURIComponent(query)}${k ? `&type=${k}` : ""}`;
  const suggestions: PageKey[] = ["services", "schemes", "grievance", "announcements", "projects", "contact"];

  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-8">
          <p className="text-[16px] font-semibold tracking-wide text-[#ea7f14] uppercase">{t("searchEyebrow")}</p>
          <h1 className="mt-2 text-[32px] leading-[44px] font-bold text-black">{query ? t("searchHeading", { query }) : t("searchTitle")}</h1>
          <form action={`/${slug}/search`} method="get" role="search" className="mt-6 flex flex-col gap-3 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">{t("searchTitle")}</span>
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[#6e7a73]" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                autoFocus={!query}
                placeholder={t("searchPlaceholder")}
                className="h-[52px] w-full rounded-full border border-[#135130]/30 bg-white pr-4 pl-12 text-[16px] text-black outline-none focus:border-[#135130] focus:ring-2 focus:ring-[#135130]/15"
              />
            </label>
            <button type="submit" className="h-[52px] rounded-full bg-[#135130] px-8 text-[15px] font-semibold text-white hover:opacity-90">
              {t("searchTitle")}
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-8">
        {words.length === 0 ? (
          <div>
            <p className="text-[15px] text-[#414141]">{query ? t("searchTooShort") : t("searchHint")}</p>
            <SuggestionLinks slug={slug} keys={suggestions} label={t("searchPopular")} name={(k) => t(k)} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-[15px] text-[#414141]" aria-live="polite">
                {t("searchResults", { count: hits.length, query })}
              </p>
              {hits.length > 0 && (
                <nav aria-label={t("searchFilter")} className="flex flex-wrap gap-2">
                  <FilterChip href={href(null)} active={!kindFilter} label={`${t("searchAll")} (${hits.length})`} />
                  {KINDS.filter((k) => counts[k] > 0).map((k) => (
                    <FilterChip key={k} href={href(k)} active={kindFilter === k} label={`${kindLabel(k)} (${counts[k]})`} />
                  ))}
                </nav>
              )}
            </div>

            {hits.length === 0 ? (
              <div className="mt-6 rounded-[15px] border border-black/10 bg-white p-8 text-center shadow-[0_0_20px_rgba(0,0,0,0.08)]">
                <p className="text-[18px] font-semibold text-black">{t("searchEmpty", { query })}</p>
                <p className="mt-2 text-[14px] text-[#414141]">{t("searchEmptyHint")}</p>
                <SuggestionLinks slug={slug} keys={suggestions} label={t("searchPopular")} name={(k) => t(k)} centered />
              </div>
            ) : (
              <ul className="mt-6 grid gap-4">
                {shown.map((h) => (
                  <li key={h.href}>
                    <Link href={h.href} className="group block rounded-[15px] border border-black/10 bg-white p-5 shadow-[0_0_20px_rgba(0,0,0,0.06)] transition hover:border-[#135130]/40 hover:shadow-[0_0_20px_rgba(19,81,48,0.15)]">
                      <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#135130]">
                        <span className="rounded-full bg-[#e3efe7] px-3 py-0.5">{kindLabel(h.kind)}</span>
                        {h.context && <span className="text-[#6e7a73]">{h.context}</span>}
                      </p>
                      <p className="mt-2 flex items-center gap-2 text-[18px] leading-[26px] font-semibold text-black group-hover:text-[#135130]">
                        <Marked text={h.title} words={words} />
                        <ArrowRight className="size-4 shrink-0 opacity-0 transition group-hover:opacity-100" aria-hidden />
                      </p>
                      {h.text && (
                        <p className="mt-1 text-[14px] leading-[22px] text-[#414141]">
                          <Marked text={snippet(h.text, words)} words={words} />
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function FilterChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn("rounded-full border px-4 py-1.5 text-[13px] font-medium", active ? "border-[#135130] bg-[#135130] text-white" : "border-[#135130]/40 bg-white text-[#135130] hover:bg-[#e3efe7]")}
    >
      {label}
    </Link>
  );
}

function SuggestionLinks({ slug, keys, label, name, centered = false }: { slug: string; keys: PageKey[]; label: string; name: (k: PageKey) => string; centered?: boolean }) {
  return (
    <div className={cn("mt-6", centered && "flex flex-col items-center")}>
      <p className="text-[13px] font-semibold text-[#6e7a73] uppercase">{label}</p>
      <div className={cn("mt-3 flex flex-wrap gap-2", centered && "justify-center")}>
        {keys.map((k) => (
          <Link key={k} href={pageHref(slug, k)} className="rounded-full border border-[#135130]/40 bg-white px-4 py-1.5 text-[14px] text-[#135130] hover:bg-[#e3efe7]">
            {name(k)}
          </Link>
        ))}
      </div>
    </div>
  );
}
