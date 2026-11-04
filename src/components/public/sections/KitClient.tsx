"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Children, useState } from "react";
import { cn } from "@/lib/cn";

export interface ProjectCard {
  stage: string;
  name: string;
  location?: string;
  year?: string;
  budget?: string;
  outcome?: string;
  families?: string;
  imageUrl?: string;
  /** Both set: the card picture is a before / after comparison slider. */
  beforeUrl?: string;
  afterUrl?: string;
  /** Project page of a published record; placeholder cards have none and jump to themselves. */
  href?: string;
}
export interface TabDef {
  key: string;
  label: string;
}
export interface ProjectLabels {
  year: string;
  budget: string;
  outcome: string;
  families: string;
  details: string;
  stageLabel: Record<string, string>;
  empty: string;
  before?: string;
  after?: string;
}

/** Key projects: stage tabs + project cards (Figma "3. Key Projects"). */
export function ProjectTabs({
  tabs,
  items,
  labels,
}: {
  tabs: TabDef[];
  items: ProjectCard[];
  labels: ProjectLabels;
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const shown = items.filter((p) => p.stage === active);
  return (
    <div>
      <div
        role="tablist"
        className="flex flex-wrap justify-end gap-8 text-[14px]"
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === active}
            onClick={() => setActive(t.key)}
            className={cn(
              "border-b-2 pb-1 font-medium",
              t.key === active
                ? "border-[#135130] text-black"
                : "border-transparent text-[#414141] hover:text-black",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-8 rounded-[10px] border border-black/10 bg-white p-8 text-center text-sm text-[#414141]">
          {labels.empty}
        </p>
      ) : (
        <ul className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {shown.map((p, i) => {
            // Published projects open their own page; placeholder cards jump to themselves (all their details are on the card).
            const id = `project-${p.stage.toLowerCase()}-${i + 1}`;
            return (
              <li
                key={i}
                id={id}
                className="scroll-mt-[180px] overflow-hidden rounded-[10px] border border-black/20 bg-white"
              >
                <div className="relative h-[205px] bg-[#e8e4d9]">
                  {p.beforeUrl && p.afterUrl ? (
                    <Compare item={{ label: p.name, beforeUrl: p.beforeUrl, afterUrl: p.afterUrl, height: 205 }} before={labels.before ?? ""} after={labels.after ?? ""} bare />
                  ) : p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- backend-served media / static design asset
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <span className="absolute top-[23px] right-[11px] rounded-full bg-[#138808] px-2.5 py-0.5 text-[12px] text-white">
                    {labels.stageLabel[p.stage] ?? p.stage}
                  </span>
                </div>
                <div className="px-[46px] pt-3 pb-7">
                  <h3 className="text-[16px] leading-[19px] text-black">
                    {p.name}
                  </h3>
                  {p.location && (
                    <p className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#138808]">
                      <MapPin className="size-4" aria-hidden /> {p.location}
                    </p>
                  )}
                  <dl className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2.5 text-[14px] text-[#414141]">
                    {p.year && (
                      <>
                        <dt>{labels.year}</dt>
                        <dd className="font-semibold">{p.year}</dd>
                      </>
                    )}
                    {p.budget && (
                      <>
                        <dt>{labels.budget}</dt>
                        <dd className="font-semibold">{p.budget}</dd>
                      </>
                    )}
                    {p.outcome && (
                      <>
                        <dt>{labels.outcome}</dt>
                        <dd className="font-semibold">{p.outcome}</dd>
                      </>
                    )}
                    {p.families && (
                      <>
                        <dt>{labels.families}</dt>
                        <dd className="font-semibold">{p.families}</dd>
                      </>
                    )}
                  </dl>
                  <div className="mt-5 flex justify-center">
                    <Link
                      href={p.href ?? `#${id}`}
                      className="rounded-full border-[0.6px] border-[#135130] px-[30px] py-2 text-[13.5px] text-[#135130] hover:bg-[#135130]/5"
                    >
                      {labels.details}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export interface BeforeAfterItem {
  label: string;
  height?: number;
  beforeUrl: string;
  afterUrl: string;
}

/** Draggable before/after comparison tile. */
function Compare({
  item,
  before,
  after,
  bare,
}: {
  item: BeforeAfterItem;
  before: string;
  after: string;
  /** Fill the parent without the rounded frame and caption (project card picture). */
  bare?: boolean;
}) {
  const [pos, setPos] = useState(50);
  return (
    <div>
      <div
        className={cn("relative overflow-hidden bg-[#e8e4d9]", !bare && "rounded-[10px]")}
        style={{ height: item.height ?? 190 }}
      >
        {/* eslint-disable @next/next/no-img-element -- static design assets */}
        <img
          src={item.afterUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
        />
        <img
          src={item.beforeUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          loading="lazy"
        />
        {/* eslint-enable @next/next/no-img-element */}
        <span className={cn("absolute left-2 rounded-full bg-white px-1.5 py-px text-[8px] text-black", bare ? "bottom-3" : "top-3")}>
          {before}
        </span>
        <span className={cn("absolute right-2 rounded-full bg-[#138808] px-1.5 py-px text-[8px] text-white", bare ? "bottom-3" : "top-3")}>
          {after}
        </span>
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-white"
          style={{ left: `${pos}%` }}
        >
          <span className="absolute top-1/2 left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[10px] text-[#135130] shadow">
            ◂▸
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label={item.label}
          className="absolute inset-0 size-full cursor-ew-resize opacity-0"
        />
      </div>
      {!bare && <p className="mt-3 text-center text-[14px] text-black">{item.label}</p>}
    </div>
  );
}

export function BeforeAfterGrid({
  items,
  before,
  after,
  grid,
}: {
  items: BeforeAfterItem[];
  before: string;
  after: string;
  /** Always the four-column gallery grid (a single tile keeps the tile size instead of the full width). */
  grid?: boolean;
}) {
  return (
    <ul
      className={
        items.length === 1 && !grid
          ? "grid gap-5"
          : "grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {items.map((it, i) => (
        <li key={i}>
          <Compare item={it} before={before} after={after} />
        </li>
      ))}
    </ul>
  );
}

export interface MediaCard {
  category?: string;
  title: string;
  meta?: string;
  imageUrl?: string;
  /** "photo" shows a camera badge, "play" a play button over the picture. */
  kind?: "photo" | "play" | "none";
}

/** Category tabs + media/blog cards (Gallery photos & videos, Youth Speak blogs). */
export function MediaTabs({
  tabs,
  items,
  emptyLabel,
}: {
  tabs: TabDef[];
  items: MediaCard[];
  emptyLabel: string;
}) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const shown = items.filter(
    (m) => active === tabs[0]?.key || !m.category || m.category === active,
  );
  return (
    <div>
      {tabs.length > 1 && (
        <div
          role="tablist"
          className="mb-6 flex flex-wrap justify-center gap-4"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={t.key === active}
              onClick={() => setActive(t.key)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[13.5px]",
                t.key === active
                  ? "border-[#135130] bg-[#135130] text-white"
                  : "border-[#135130] text-[#135130] hover:bg-[#135130]/5",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="rounded-[10px] border border-black/10 bg-white p-8 text-center text-sm text-[#414141]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((m, i) => (
            <li
              key={i}
              className="overflow-hidden rounded-[10px] bg-white shadow-[0_0_14px_rgba(0,0,0,0.2)]"
            >
              <div className="relative h-[194px] bg-[#e8e4d9]">
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- static design asset / backend media
                  <img
                    src={m.imageUrl}
                    alt=""
                    className="size-full object-cover"
                    loading="lazy"
                  />
                )}
                {m.kind === "play" && (
                  <span
                    aria-hidden
                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                  >
                    <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-[#135130]">
                      ▶
                    </span>
                  </span>
                )}
              </div>
              <div className="flex items-start justify-between gap-2 px-[17px] py-4">
                <div>
                  <p className="text-[14px] leading-5 font-medium text-black">
                    {m.title}
                  </p>
                  {m.meta && (
                    <p className="mt-2 text-[12px] text-[#414141]">{m.meta}</p>
                  )}
                </div>
                {m.kind === "photo" && (
                  <span
                    aria-hidden
                    className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[#e9f4e9] text-[#135130]"
                  >
                    ▣
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface CoverageWard {
  wardNo: string;
  households: number;
  beneficiaries: number | null;
  colour?: string;
}
export interface CoverageView {
  wards: CoverageWard[];
  totalHouseholds: number;
  totalBeneficiaries: number | null;
  /** Map picture for the selected scheme. */
  mapUrl?: string;
}
export interface CoverageLabels {
  heading: string;
  subheading: string;
  selectScheme: string;
  allSchemes: string;
  /** "Ward {no}" */
  ward: string;
  households: string;
  beneficiaries: string;
  totalBeneficiaries: string;
  totalHouseholds: string;
  legend: string;
  empty: string;
}

const SHADES = ["#d6ecd9", "#a9d8b0", "#6fbf7d", "#3a9a50", "#1e7a37", "#135130"];

/**
 * "Scheme Coverage Map" (Figma 4. Schemes): the "Select Scheme" dropdown loads that scheme's ward coverage from
 * GET /api/v1/public/:slug/schemes/coverage?schemeId=. Shows the scheme's map picture when it has one, else the
 * wards as shaded blocks (households reached, beneficiaries), with the totals underneath.
 */
export function SchemeCoverageClient({
  slug,
  schemes,
  initialSchemeId,
  initial,
  sectionMapUrl,
  labels,
  locale,
  card,
}: {
  slug: string;
  schemes: { id: string; name: string }[];
  initialSchemeId: string;
  initial: CoverageView;
  /** The section's own picture, used while the selection has no picture and no ward figures. */
  sectionMapUrl?: string;
  labels: CoverageLabels;
  locale: string;
  /** Right-hand column beside "Scheme Information": carries the section anchor itself. */
  card?: boolean;
}) {
  const [schemeId, setSchemeId] = useState(initialSchemeId);
  const [view, setView] = useState<CoverageView>(initial);
  const [loading, setLoading] = useState(false);
  const nf = new Intl.NumberFormat(locale === "mr" ? "mr-IN" : "en-IN");

  async function choose(id: string) {
    setSchemeId(id);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/public/${encodeURIComponent(slug)}/schemes/coverage${id ? `?schemeId=${encodeURIComponent(id)}` : ""}`);
      const json = (await res.json()) as { data?: { wards: CoverageWard[]; totalHouseholds: number; totalBeneficiaries: number | null; mapImageId: string | null } };
      const d = json.data;
      if (res.ok && d) {
        setView({
          wards: d.wards,
          totalHouseholds: d.totalHouseholds,
          totalBeneficiaries: d.totalBeneficiaries,
          mapUrl: d.mapImageId ? `/api/v1/public/${encodeURIComponent(slug)}/media/${encodeURIComponent(d.mapImageId)}` : undefined,
        });
      }
    } catch {
      // Network error: keep the figures already shown.
    } finally {
      setLoading(false);
    }
  }

  const max = Math.max(1, ...view.wards.map((w) => w.households));
  const shade = (n: number) => SHADES[Math.min(SHADES.length - 1, Math.floor((n / max) * SHADES.length - 0.0001))] ?? SHADES[0]!;
  const picture = view.mapUrl ?? (view.wards.length === 0 ? sectionMapUrl : undefined);
  const wardName = (no: string) => labels.ward.replace("{no}", no);

  return (
    <div id={card ? "coverage-map" : undefined} className="flex min-w-0 scroll-mt-[180px] flex-col">
      <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{labels.heading}</h2>
      <p className="mt-2 text-center text-[20px] leading-[30px] text-black">{labels.subheading}</p>
      <div className="mt-[14px] overflow-hidden rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.05)]">
        <div className={cn("relative transition-opacity", loading && "opacity-60")}>
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element -- website media / design picture
            <img src={picture} alt={labels.heading} loading="lazy" width={873} height={510} className="block h-auto w-full" />
          ) : view.wards.length > 0 ? (
            <ul className="grid min-h-[320px] gap-2 bg-[#1d3b24] p-3 pt-[92px] sm:pt-3 sm:pl-[204px]" style={{ gridTemplateColumns: `repeat(${Math.min(view.wards.length, 3)}, minmax(0, 1fr))` }}>
              {view.wards.map((w) => (
                <li
                  key={w.wardNo}
                  className="flex flex-col items-center justify-center rounded-[12px] px-2 py-4 text-center"
                  style={{ backgroundColor: w.colour ?? shade(w.households), color: w.households / max > 0.4 ? "#fff" : "#0b3a1b" }}
                >
                  <span className="text-[13px] font-semibold">{wardName(w.wardNo)}</span>
                  <span className="text-[20px] font-bold">{nf.format(w.households)}</span>
                  <span className="text-[11px]">{labels.households}</span>
                  {w.beneficiaries !== null && (
                    <span className="mt-1 text-[11px] font-semibold">
                      {nf.format(w.beneficiaries)} {labels.beneficiaries}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex min-h-[320px] items-center justify-center bg-[#f4f1ea] px-6 pt-20 text-center text-[14px] text-[#414141] sm:pt-0">{labels.empty}</p>
          )}
          {schemes.length > 0 && (
            <label className="absolute top-3 left-3 flex w-[184px] flex-col gap-1 rounded-[6px] bg-white px-3 py-2 text-[11px] font-medium text-black shadow">
              {labels.selectScheme}
              <span className="relative">
                <select
                  value={schemeId}
                  onChange={(e) => void choose(e.target.value)}
                  className="w-full appearance-none rounded-[4px] border border-black/20 bg-white py-1.5 pr-6 pl-2 text-[12px] font-semibold outline-none focus:border-[#135130]"
                >
                  <option value="">{labels.allSchemes}</option>
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span aria-hidden className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px]">
                  ▾
                </span>
              </span>
            </label>
          )}
          {!picture && view.wards.length > 0 && (
            <div className="absolute bottom-3 left-3 hidden w-[184px] rounded-[6px] bg-white px-3 py-2 text-[11px] shadow sm:block">
              <p className="font-semibold text-black">{labels.legend}</p>
              <ul className="mt-1 space-y-1">
                {SHADES.map((c, i) => (
                  <li key={c} className="flex items-center gap-2">
                    <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: c }} />
                    {nf.format(Math.round((max * i) / SHADES.length))} – {nf.format(Math.round((max * (i + 1)) / SHADES.length))}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {(view.totalBeneficiaries !== null || view.totalHouseholds > 0) && (
          <dl className="flex flex-wrap justify-center gap-x-10 gap-y-2 border-t border-black/10 px-4 py-3 text-[14px]">
            {view.totalBeneficiaries !== null && (
              <div className="flex items-baseline gap-2">
                <dt className="text-[#414141]">{labels.totalBeneficiaries}</dt>
                <dd className="text-[18px] font-bold text-[#135130]">{nf.format(view.totalBeneficiaries)}</dd>
              </div>
            )}
            {view.totalHouseholds > 0 && (
              <div className="flex items-baseline gap-2">
                <dt className="text-[#414141]">{labels.totalHouseholds}</dt>
                <dd className="text-[18px] font-bold text-[#135130]">{nf.format(view.totalHouseholds)}</dd>
              </div>
            )}
          </dl>
        )}
        {/* The ward figures stay available to screen readers whatever the map shows. */}
        <table className="sr-only">
          <thead>
            <tr>
              <th>{labels.households}</th>
              <th>{labels.beneficiaries}</th>
            </tr>
          </thead>
          <tbody>
            {view.wards.map((w) => (
              <tr key={w.wardNo}>
                <td>
                  {wardName(w.wardNo)}: {nf.format(w.households)}
                </td>
                <td>{w.beneficiaries !== null ? nf.format(w.beneficiaries) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Announcement list filtered by the `category` query parameter (category tiles link to
 * "?category=Jobs#live-announcements"). Rows are rendered on the server; `categories[i]` is the category of row i.
 * Without a filter the first `limit` rows are shown.
 */
export function CategoryFilteredList({
  categories,
  limit,
  listClassName,
  emptyClassName,
  emptyLabel,
  filteredByLabel,
  showAllLabel,
  children,
}: {
  categories: string[];
  limit: number;
  listClassName: string;
  emptyClassName: string;
  emptyLabel: string;
  /** "Category: {category}" */
  filteredByLabel: string;
  showAllLabel: string;
  children: React.ReactNode;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const wanted = params.get("category")?.trim().toLowerCase() ?? "";
  const rows = Children.toArray(children);
  const shown = wanted ? rows.filter((_, i) => categories[i]?.toLowerCase() === wanted) : rows.slice(0, limit);
  const name = wanted ? (categories.find((c) => c.toLowerCase() === wanted) ?? params.get("category") ?? "") : "";
  return (
    <>
      {wanted && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
          <span className="rounded-full bg-[#dcefdc] px-3 py-1 font-medium text-[#135130]">{filteredByLabel.replace("{category}", name)}</span>
          <Link href={`${pathname}#live-announcements`} scroll={false} className="font-medium text-[#135130] hover:underline">
            {showAllLabel}
          </Link>
        </p>
      )}
      <ul className={listClassName}>{shown.length > 0 ? shown : <li className={emptyClassName}>{emptyLabel}</li>}</ul>
    </>
  );
}

/** Server fallback while the query string is read (shows the unfiltered list). */
export function UnfilteredList({ limit, listClassName, children }: { limit: number; listClassName: string; children: React.ReactNode }) {
  return <ul className={listClassName}>{Children.toArray(children).slice(0, limit)}</ul>;
}
