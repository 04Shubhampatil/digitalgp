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
/** Design photos used when a published project has no cover image. */
const PROJECT_FALLBACK_PHOTOS = ["/images/figma/about-road.png", "/images/figma/about-aerial.png", "/images/figma/pages/prj-after.png"];

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
        <ul className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-[18px]">
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
                  ) : (
                    // A project without a cover photo shows one of the design's village photos, not an empty grey box.
                    // eslint-disable-next-line @next/next/no-img-element -- backend-served media / static design asset
                    <img
                      src={p.imageUrl ?? PROJECT_FALLBACK_PHOTOS[i % PROJECT_FALLBACK_PHOTOS.length]}
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
                  {/* Figma 375:13936: values start 192px after the labels, rows 28px apart. */}
                  <dl className="mt-6 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-[9px] text-[14px] leading-[19px] text-[#414141] lg:grid-cols-[176px_minmax(0,1fr)]">
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
  // "?all=1" (the "View All" buttons) lists every announcement instead of the first `limit`.
  const everything = params.get("all") === "1";
  const shown = wanted ? rows.filter((_, i) => categories[i]?.toLowerCase() === wanted) : everything ? rows : rows.slice(0, limit);
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
