"use client";

import { CircleAlert, Maximize, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { COVERAGE_SHAPES } from "./coverage-shapes";

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
  /** "Ward No. {no}" */
  wardNo: string;
  households: string;
  beneficiaries: string;
  totalBeneficiaries: string;
  totalHouseholds: string;
  legend: string;
  empty: string;
  clickWard: string;
  zoomIn: string;
  zoomOut: string;
  fullscreen: string;
}

/** Legend of the Figma map: households per ward → colour. */
const BINS = [
  { max: 10, colour: "#91dfc8", label: "0 - 10" },
  { max: 25, colour: "#5dcda3", label: "11 - 25" },
  { max: 50, colour: "#03af57", label: "26 - 50" },
  { max: 100, colour: "#039f2f", label: "51 - 100" },
  { max: 200, colour: "#017f1b", label: "101 - 200" },
  { max: Infinity, colour: "#02501b", label: "200+" },
];
const binOf = (n: number) => BINS.find((b) => n <= b.max) ?? BINS[BINS.length - 1]!;

const W = 873;
const H = 446;
const DESIGN_MAP = "/images/figma/pages/sch-coverage-map.png";

/**
 * "Scheme Coverage Map" (Figma 4. Schemes): a satellite map with the ward outlines shaded by the households each ward
 * reached, the "Select Scheme" dropdown (loads that scheme's ward coverage from GET /api/v1/public/:slug/schemes/coverage),
 * the legend, zoom / full-screen buttons and the "Click on a ward" line (a click shows the ward's figures). A scheme with its
 * own map picture shows that picture instead of the outlines.
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
  const [selected, setSelected] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [scale, setScale] = useState(1);
  const outer = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const nf = new Intl.NumberFormat(locale === "mr" ? "mr-IN" : "en-IN");

  // The map is laid out in the design's 873×446 space and scaled to the column width.
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / W);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function choose(id: string) {
    setSchemeId(id);
    setLoading(true);
    setSelected(null);
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

  const toggleFullscreen = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const wards = [...view.wards].sort((a, b) => Number(a.wardNo) - Number(b.wardNo));
  // Outlines are assigned to the wards in order; the design's sixth outline repeats the last ward when there are only five.
  const wardFor = (i: number): CoverageWard | undefined => wards[i] ?? (i === COVERAGE_SHAPES.length - 1 ? wards[wards.length - 1] : undefined);
  const picture = view.mapUrl ?? (wards.length === 0 ? sectionMapUrl : undefined);
  const designPicture = !!picture && picture.startsWith("/images/");
  const wardName = (no: string) => labels.wardNo.replace("{no}", no);
  const pickedWard = selected !== null ? wardFor(selected) : undefined;

  const selectBox =
    schemes.length > 0 ? (
      <label className="absolute top-[19px] left-3 block h-[81px] w-[217px] rounded-[10px] bg-white text-left shadow-[0_0_10px_rgba(0,0,0,0.15)]">
        <span className="absolute top-[13px] left-4 text-[14px] leading-[18px] font-medium text-[#222]">{labels.selectScheme}</span>
        <select
          value={schemeId}
          onChange={(e) => void choose(e.target.value)}
          className="absolute right-[13px] bottom-[9px] left-[14px] h-9 appearance-none truncate rounded-[8px] bg-[#f1f3f2] pr-8 pl-3 text-[14px] font-semibold text-[#222] outline-none focus-visible:ring-2 focus-visible:ring-[#135130]"
        >
          <option value="">{labels.allSchemes}</option>
          {schemes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <svg aria-hidden viewBox="0 0 10 6" className="pointer-events-none absolute right-6 bottom-[24px] h-[6px] w-[10px]" fill="none" stroke="#222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </label>
    ) : null;

  return (
    <div id={card ? "coverage-map" : undefined} className="flex min-w-0 scroll-mt-[180px] flex-col">
      <h2 className="text-center text-[30px] leading-[45px] font-semibold text-black">{labels.heading}</h2>
      <p className="mt-2 text-center text-[20px] leading-[30px] text-black">{labels.subheading}</p>
      <div ref={frame} className="mt-5 flex flex-col overflow-hidden rounded-[10px] bg-white lg:mt-[44px]">
        {designPicture ? (
          // The design picture of the placeholder page (no published schemes yet): it carries its own controls.
          // eslint-disable-next-line @next/next/no-img-element -- design picture
          <img src={picture} alt={labels.heading} loading="lazy" width={873} height={510} className="block h-auto w-full" />
        ) : (
          <>
            <div ref={outer} className={cn("relative w-full overflow-hidden rounded-t-[10px] bg-[#2b3622] transition-opacity", loading && "opacity-60")} style={{ aspectRatio: `${W} / ${H}` }}>
              <div className="absolute top-0 left-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${scale})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- design picture, cropped to its map area */}
                <img src={picture ?? DESIGN_MAP} alt="" width={W} height={510} className={cn("absolute top-0 left-0 h-[510px] w-[873px] max-w-none object-cover", !picture && "object-top")} />
                {!picture && wards.length > 0 && (
                  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="absolute top-0 left-0" role="group" aria-label={labels.heading}>
                    <g style={{ transform: `scale(${zoom})`, transformOrigin: `${W / 2}px ${H / 2}px`, transition: "transform .25s" }}>
                      {/* Hides the sample outlines of the design picture below the live ones. */}
                      {COVERAGE_SHAPES.map((s, i) => (
                        <path key={`u${i}`} d={s.d} fill="#2b3622" stroke="#2b3622" strokeWidth={9} strokeLinejoin="round" />
                      ))}
                      {COVERAGE_SHAPES.map((s, i) => {
                        const w = wardFor(i);
                        const fill = w ? (w.colour ?? binOf(w.households).colour) : "#4d6a44";
                        const on = selected === i;
                        return (
                          <g
                            key={i}
                            role={w ? "button" : undefined}
                            tabIndex={w ? 0 : undefined}
                            aria-label={w ? `${wardName(w.wardNo)}: ${nf.format(w.households)} ${labels.households}` : undefined}
                            aria-pressed={w ? on : undefined}
                            className={cn("outline-none", w && "cursor-pointer")}
                            onClick={() => w && setSelected(on ? null : i)}
                            onKeyDown={(e) => {
                              if (w && (e.key === "Enter" || e.key === " ")) {
                                e.preventDefault();
                                setSelected(on ? null : i);
                              }
                            }}
                          >
                            <path d={s.d} fill={fill} stroke="#fff" strokeWidth={on ? 4 : 2} strokeLinejoin="round" style={{ filter: on ? "brightness(1.12)" : undefined }} />
                            {w && (
                              <text x={s.label[0]} y={s.label[1]} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={15} fontWeight={600} style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 3 }} pointerEvents="none">
                                {wardName(w.wardNo)}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                )}
                {wards.length === 0 && !picture && <p className="absolute inset-0 flex items-center justify-center bg-[#2b3622]/85 px-6 text-center text-[14px] text-white">{labels.empty}</p>}
                {selectBox}
                {!picture && wards.length > 0 && (
                  <div className="absolute top-[210px] left-3 h-[222px] w-[183px] rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)]">
                    <p className="absolute top-[14px] left-4 text-[13.5px] leading-5 font-bold whitespace-nowrap text-[#222]">{labels.legend}</p>
                    <ul className="absolute top-[47px] left-[18px] space-y-[12px]">
                      {BINS.map((b) => (
                        <li key={b.label} className="flex h-4 items-center gap-3 text-[14px] leading-4 text-[#333]">
                          <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: b.colour }} />
                          {b.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!picture && wards.length > 0 && (
                  <div className="absolute top-5 left-[815px] flex flex-col gap-[17px]">
                    <div className="flex w-[43px] flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)]">
                      <button type="button" aria-label={labels.zoomIn} onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.4).toFixed(1)))} className="flex h-[41px] items-center justify-center text-[#222] hover:bg-black/5">
                        <Plus className="size-5" strokeWidth={2.6} aria-hidden />
                      </button>
                      <span aria-hidden className="mx-1.5 h-px bg-black/10" />
                      <button type="button" aria-label={labels.zoomOut} onClick={() => setZoom((z) => Math.max(1, +(z - 0.4).toFixed(1)))} className="flex h-[41px] items-center justify-center text-[#222] hover:bg-black/5">
                        <Minus className="size-5" strokeWidth={2.6} aria-hidden />
                      </button>
                    </div>
                    <button type="button" aria-label={labels.fullscreen} onClick={toggleFullscreen} className="flex size-[43px] items-center justify-center rounded-[10px] bg-white text-[#222] shadow-[0_0_10px_rgba(0,0,0,0.15)] hover:bg-black/5">
                      <Maximize className="size-5" strokeWidth={2.2} aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="flex h-[63px] items-center justify-center gap-4 px-4 text-center text-[16px] text-[#333]" aria-live="polite">
              <CircleAlert className="size-[22px] shrink-0 -scale-y-100 text-[#135130]" strokeWidth={2.2} aria-hidden />
              {pickedWard ? (
                <span>
                  <b className="font-semibold text-[#135130]">{wardName(pickedWard.wardNo)}</b>
                  {` · ${labels.households}: `}
                  <b className="font-semibold">{nf.format(pickedWard.households)}</b>
                  {pickedWard.beneficiaries !== null && (
                    <>
                      {` · ${labels.beneficiaries}: `}
                      <b className="font-semibold">{nf.format(pickedWard.beneficiaries)}</b>
                    </>
                  )}
                </span>
              ) : (
                labels.clickWard
              )}
            </p>
          </>
        )}
        {/* The ward figures (and totals) stay available to screen readers whatever the map shows. */}
        <table className="sr-only">
          <caption>
            {view.totalBeneficiaries !== null && `${labels.totalBeneficiaries}: ${nf.format(view.totalBeneficiaries)}. `}
            {view.totalHouseholds > 0 && `${labels.totalHouseholds}: ${nf.format(view.totalHouseholds)}.`}
          </caption>
          <thead>
            <tr>
              <th>{labels.ward}</th>
              <th>{labels.households}</th>
              <th>{labels.beneficiaries}</th>
            </tr>
          </thead>
          <tbody>
            {wards.map((w) => (
              <tr key={w.wardNo}>
                <td>{labels.ward.replace("{no}", w.wardNo)}</td>
                <td>{nf.format(w.households)}</td>
                <td>{w.beneficiaries !== null ? nf.format(w.beneficiaries) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
