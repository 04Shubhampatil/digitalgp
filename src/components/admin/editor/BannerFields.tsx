"use client";

import { Crop, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form";
import type { FieldSpec, SectionEditorSpec } from "@/config/section-editors";
import { adminMediaUrl } from "@/lib/api/admin";
import { cn } from "@/lib/cn";
import type { FormRecord } from "@/lib/section-data";
import { FieldInput } from "./FieldInput";

/**
 * The Banner section laid out as in the design: six numbered blocks (layout cards, content with CTA buttons,
 * image, text position, overlay, appearance). It reads and writes the same form paths as the generic editor,
 * so saving, validation and the draft workflow are unchanged.
 */
const LAYOUTS = ["full-background", "image-right", "image-left", "framed-image"] as const;

const card = "rounded-[10px] border border-line bg-surface p-4";
const heading = "mb-3 text-[15px] font-bold text-ink";
const subLabel = "mb-1.5 block text-[11px] font-medium text-muted";
const control = "h-9 w-full rounded-[4px] border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-primary disabled:opacity-60";

function Wireframe({ kind, imageUrl }: { kind: (typeof LAYOUTS)[number]; imageUrl?: string }) {
  // The picture area shows the uploaded banner image, as the layout cards do in the design.
  const img = "bg-[#dfe3ea] bg-cover bg-center";
  const bg = imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined;
  if (kind === "full-background") return <span className={cn("block h-14 w-28", img)} style={bg} />;
  if (kind === "framed-image") return <span className="flex h-14 w-32 items-center justify-center border border-line bg-surface"><span className={cn("block h-10 w-24 rounded-[3px]", img)} style={bg} /></span>;
  return (
    <span className={cn("flex h-14 w-32 border border-line bg-surface", kind === "image-left" && "flex-row-reverse")}>
      <span className="flex w-1/2 flex-col justify-center gap-1 px-2">
        <span className="h-1.5 w-full rounded bg-[#c9cfd9]" />
        <span className="h-1 w-2/3 rounded bg-[#dfe3ea]" />
      </span>
      <span className={cn("w-1/2", img)} style={bg} />
    </span>
  );
}

const GRADIENT: Record<string, string> = { "left-right": "to right", "right-left": "to left", "top-bottom": "to bottom" };
const H_POS: Record<string, string> = { left: "justify-start text-left", center: "justify-center text-center", right: "justify-end text-right" };
const V_POS: Record<string, string> = { top: "items-start", middle: "items-center", bottom: "items-end" };
const P_WIDTH: Record<string, string> = { small: "max-w-[45%]", medium: "max-w-[65%]", large: "max-w-[90%]" };

function rgba(hex: string, percent: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${percent / 100})`;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${percent / 100})`;
}

/** Live preview of the banner as the public page draws it (same layouts, text position, overlay and colours). */
function BannerPreview({ control, emptyLabel, fallbackImage }: { control: Control<FormRecord>; emptyLabel: string; fallbackImage?: string }) {
  const v = useWatch({ control }) as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === "string" ? x : "");
  const two = (x: unknown) => {
    const o = (x ?? {}) as { en?: string; mr?: string };
    return o.en || o.mr || "";
  };
  const layout = str(v.layout) || "full-background";
  // No upload yet: the website shows the design photo, so the preview does too.
  const imageUrl = str(v.imageId) ? adminMediaUrl(str(v.imageId)) : (fallbackImage ?? "");
  const heading = two(v.heading);
  const supporting = two(v.supportingText);
  const description = two(v.description);
  const pos = (v.textPosition ?? {}) as { horizontal?: string; vertical?: string };
  const overlay = (v.overlay ?? {}) as { enabled?: boolean; colour?: string; intensity?: unknown; gradient?: string };
  const look = (v.appearance ?? {}) as { height?: unknown; contentWidth?: string; cornerRadius?: unknown; textColour?: string };
  const ctas = (Array.isArray(v.ctas) ? (v.ctas as { label?: unknown }[]) : []).map((c) => two(c.label)).filter(Boolean);
  // The preview is drawn at about 45% of the real height (banner height is 200 to 1200px on the website).
  const height = Math.max(150, Math.min(380, (Number(look.height) || 520) * 0.45));
  const radius = Math.min(Number(look.cornerRadius) || 0, 24);
  const intensity = Number(overlay.intensity) || 40;
  const colour = str(overlay.colour) || "#000000";
  const overlayBg = overlay.enabled ? (overlay.gradient && GRADIENT[overlay.gradient] ? `linear-gradient(${GRADIENT[overlay.gradient]}, ${rgba(colour, intensity)}, transparent)` : rgba(colour, intensity)) : undefined;
  const empty = !heading && !supporting && !description && !imageUrl;

  const copy = (light: boolean) => (
    <>
      {!light && supporting && <p className="mb-2 text-[11px] leading-4 font-semibold text-[#ea7f14] uppercase">{supporting}</p>}
      {heading && <p className="text-[18px] leading-[1.25] font-bold">{heading}</p>}
      {light && supporting && <p className="mt-1 text-[12px] leading-4 font-medium">{supporting}</p>}
      {description && <p className={cn("mt-1.5 line-clamp-3 text-[11px] leading-4", !light && "text-[#414141]")}>{description}</p>}
      {ctas.length > 0 && (
        <span className={cn("mt-3 flex flex-wrap gap-1.5", light && pos.horizontal === "center" && "justify-center", light && pos.horizontal === "right" && "justify-end")}>
          {ctas.map((c, i) => (
            <span key={i} className={cn("rounded-full px-3 py-1 text-[10px] font-semibold", i === 0 ? (light ? "bg-white text-[#135130]" : "bg-[#135130] text-white") : light ? "border border-white" : "border border-[#135130] text-[#135130]")}>
              {c}
            </span>
          ))}
        </span>
      )}
    </>
  );

  if (empty) return <p className="rounded-[8px] border border-dashed border-line px-4 py-8 text-center text-xs text-muted">{emptyLabel}</p>;

  if (layout === "full-background") {
    return (
      <div className="relative overflow-hidden rounded-[8px] bg-[#135130]" style={{ height }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- website media served by the backend */}
        {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />}
        {overlayBg && <span aria-hidden className="absolute inset-0" style={{ background: overlayBg }} />}
        <div className={cn("relative flex h-full p-5", H_POS[pos.horizontal ?? "left"], V_POS[pos.vertical ?? "middle"])}>
          <div className={P_WIDTH[look.contentWidth ?? "medium"]} style={{ color: str(look.textColour) || "#ffffff" }}>
            {copy(true)}
          </div>
        </div>
      </div>
    );
  }
  const picture = imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- website media served by the backend
    <img src={imageUrl} alt="" className={cn("h-full max-h-full w-full object-cover", layout === "framed-image" && "border-4 border-white shadow-md")} style={{ borderRadius: radius }} />
  ) : (
    <span className="block h-full w-full bg-[#dfe3ea]" style={{ borderRadius: radius }} />
  );
  return (
    <div className="grid grid-cols-2 items-center gap-4 overflow-hidden rounded-[8px] bg-[#fdf9f2] p-4 text-black" style={{ height }}>
      {layout === "image-left" && <div className="h-full min-h-0">{picture}</div>}
      <div className="min-w-0">{copy(false)}</div>
      {layout !== "image-left" && <div className="h-full min-h-0">{picture}</div>}
    </div>
  );
}

export function BannerFields({ spec, control: ctl, tenantId, errors, canEdit, previewImage }: { spec: SectionEditorSpec; control: Control<FormRecord>; tenantId: string; errors: Record<string, string>; canEdit: boolean; previewImage?: string }) {
  const t = useTranslations("editor");
  const field = (name: string): FieldSpec => spec.fields.find((f) => f.name === name)!;
  const group = (name: string, fieldName: string): FieldSpec => spec.groups!.find((g) => g.name === name)!.fields.find((f) => f.name === fieldName)!;
  const ctas = useFieldArray({ control: ctl, name: "ctas" as never });
  const ctaSpec = spec.items!;
  const ctaField = (name: string) => ctaSpec.fields.find((f) => f.name === name)!;
  const opt = (v: string) => (t.has(`options.${v}`) ? t(`options.${v}`) : v);
  const imageId = useWatch({ control: ctl, name: "imageId" }) as unknown;
  const imageUrl = typeof imageId === "string" && imageId ? adminMediaUrl(imageId) : undefined;

  /** Segmented choice (text position, content width). */
  const segment = ({ path, options, stacked }: { path: string; options: readonly string[]; stacked?: boolean }) => (
    <Controller
      control={ctl}
      name={path}
      render={({ field: f }) => (
        <div role="radiogroup" className={cn("grid gap-2", stacked ? "grid-cols-1" : "grid-cols-3")}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={f.value === o}
              disabled={!canEdit}
              onClick={() => f.onChange(o)}
              className={cn("h-8 rounded-[4px] border text-xs font-medium transition-colors", f.value === o ? "border-primary bg-success-soft text-primary" : "border-line bg-surface text-ink hover:bg-surface-soft")}
            >
              {opt(o)}
            </button>
          ))}
        </div>
      )}
    />
  );

  const slider = ({ path, min, max, unit }: { path: string; min: number; max: number; unit: string }) => (
    <Controller
      control={ctl}
      name={path}
      render={({ field: f }) => (
        <div className="flex items-center gap-3">
          <input type="range" min={min} max={max} value={Number(f.value) || min} disabled={!canEdit} onChange={(e) => f.onChange(e.target.value)} className="h-1.5 flex-1 cursor-pointer accent-primary" />
          <input type="number" min={min} max={max} value={String(f.value ?? "")} disabled={!canEdit} onChange={(e) => f.onChange(e.target.value)} className={cn(control, "w-20 text-center")} aria-label={path} />
          <span className="text-xs text-muted">{unit}</span>
        </div>
      )}
    />
  );

  const colourBox = ({ path }: { path: string }) => (
    <Controller
      control={ctl}
      name={path}
      render={({ field: f }) => {
        const v = String(f.value ?? "");
        return (
          <div className="flex h-9 items-center gap-2 rounded-[4px] border border-line-strong bg-surface px-2">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000"} disabled={!canEdit} onChange={(e) => f.onChange(e.target.value.toUpperCase())} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" aria-label={path} />
            <input value={v} maxLength={7} disabled={!canEdit} onChange={(e) => f.onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
          </div>
        );
      }}
    />
  );

  const selectBox = ({ path, options }: { path: string; options: readonly string[] }) => (
    <Controller
      control={ctl}
      name={path}
      render={({ field: f }) => (
        <select value={String(f.value ?? "")} disabled={!canEdit} onChange={(e) => f.onChange(e.target.value)} className={control}>
          {options.map((o) => (
            <option key={o} value={o}>
              {opt(o)}
            </option>
          ))}
        </select>
      )}
    />
  );

  return (
    <div className="grid gap-4">
      {/* 1. Layout */}
      <div className={card}>
        <p className={heading}>1. {t("fields.bannerLayout")}</p>
        <Controller
          control={ctl}
          name="layout"
          render={({ field: f }) => (
            <div role="radiogroup" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {LAYOUTS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={f.value === l}
                  disabled={!canEdit}
                  onClick={() => f.onChange(l)}
                  className={cn("flex h-[104px] flex-col items-center justify-center gap-2 rounded-[8px] border text-xs font-medium transition-colors", f.value === l ? "border-primary bg-success-soft text-primary" : "border-line bg-surface text-ink hover:bg-surface-soft")}
                >
                  <Wireframe kind={l} imageUrl={imageUrl} />
                  {opt(l)}
                </button>
              ))}
            </div>
          )}
        />
        {errors.layout && <p className="mt-2 text-xs text-danger">{errors.layout}</p>}
      </div>

      {/* Live preview: what the banner looks like with the current text, picture, layout and position. */}
      <div className={card}>
        <p className={heading}>{t("livePreview")}</p>
        <BannerPreview control={ctl} emptyLabel={t("livePreviewEmpty")} fallbackImage={previewImage} />
        <p className="mt-2 text-[11px] text-muted">{t("livePreviewHint")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          {/* 2. Content */}
          <div className={card}>
            <p className={heading}>2. {t("sections.bannerContent")}</p>
            <div className="grid gap-3">
              <FieldInput spec={field("heading")} path="heading" control={ctl} tenantId={tenantId} error={errors.heading} />
              <FieldInput spec={field("supportingText")} path="supportingText" control={ctl} tenantId={tenantId} error={errors.supportingText} />
              <FieldInput spec={field("description")} path="description" control={ctl} tenantId={tenantId} error={errors.description} />
              <div>
                <span className={subLabel}>{t("fields.cta")}</span>
                <div className="grid gap-3 rounded-[8px] border border-line p-3">
                  {ctas.fields.map((row, i) => (
                    <div key={row.id} className="rounded-[6px] border border-line p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-ink">CTA {i + 1}</p>
                        {canEdit && (
                          <button type="button" aria-label={t("removeEntry")} onClick={() => ctas.remove(i)} className="rounded p-1 text-danger hover:bg-danger-soft">
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FieldInput spec={ctaField("label")} path={`ctas.${i}.label`} control={ctl} tenantId={tenantId} error={errors[`ctas.${i}.label`]} />
                        <div className="grid gap-3">
                          <FieldInput spec={ctaField("linkType")} path={`ctas.${i}.linkType`} control={ctl} tenantId={tenantId} error={errors[`ctas.${i}.linkType`]} />
                          <FieldInput spec={ctaField("href")} path={`ctas.${i}.href`} control={ctl} tenantId={tenantId} error={errors[`ctas.${i}.href`]} />
                          <FieldInput spec={ctaField("openInNewTab")} path={`ctas.${i}.openInNewTab`} control={ctl} tenantId={tenantId} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {canEdit && (
                    <button
                      type="button"
                      disabled={ctas.fields.length >= ctaSpec.max}
                      onClick={() => ctas.append({ label: { en: "", mr: "" }, linkType: "page", href: "", openInNewTab: false } as never)}
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-[4px] border border-primary text-sm font-semibold text-primary hover:bg-success-soft disabled:opacity-40"
                    >
                      <Plus className="size-4" aria-hidden /> {t("addAnotherCta")}
                    </button>
                  )}
                  <p className="text-[11px] text-muted">{t("ctaLimit", { n: ctaSpec.max })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Image */}
          <div className={card}>
            <p className={heading}>3. {t("sections.bannerImageSettings")}</p>
            <FieldInput spec={field("imageId")} path="imageId" control={ctl} tenantId={tenantId} error={errors.imageId} />
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted">
              <Crop className="size-3.5" aria-hidden /> {t("mediaHint")}
            </p>
          </div>
        </div>

        <div className="grid content-start gap-4">
          {/* 4. Text position */}
          <div className={card}>
            <p className={heading}>4. {t("fields.textPosition")}</p>
            <span className={subLabel}>{t("fields.horizontalPosition")}</span>
            {segment({ path: "textPosition.horizontal", options: group("textPosition", "horizontal").options ?? [] })}
            <span className={cn(subLabel, "mt-3")}>{t("fields.verticalAlignment")}</span>
            {segment({ path: "textPosition.vertical", options: group("textPosition", "vertical").options ?? [], stacked: true })}
          </div>

          {/* 5. Overlay */}
          <div className={card}>
            <p className={heading}>5. {t("sections.bannerOverlay")}</p>
            <FieldInput spec={group("overlay", "enabled")} path="overlay.enabled" control={ctl} tenantId={tenantId} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <span className={subLabel}>{t("fields.overlayColour")}</span>
                {colourBox({ path: "overlay.colour" })}
              </div>
              <div>
                <span className={subLabel}>{t("fields.overlayIntensity")}</span>
                {slider({ path: "overlay.intensity", min: 0, max: 100, unit: "%" })}
              </div>
              <div>
                <span className={subLabel}>{t("fields.gradientDirection")}</span>
                {selectBox({ path: "overlay.gradient", options: group("overlay", "gradient").options ?? [] })}
              </div>
            </div>
          </div>

          {/* 6. Appearance */}
          <div className={card}>
            <p className={heading}>6. {t("fields.bannerAppearance")}</p>
            <span className={subLabel}>{t("fields.bannerHeight")}</span>
            {slider({ path: "appearance.height", min: 200, max: 1200, unit: "px" })}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <span className={subLabel}>{t("fields.contentWidth")}</span>
                {selectBox({ path: "appearance.contentWidth", options: group("appearance", "contentWidth").options ?? [] })}
              </div>
              <div>
                <span className={subLabel}>{t("fields.cornerRadius")}</span>
                <Controller control={ctl} name="appearance.cornerRadius" render={({ field: f }) => <input type="number" min={0} max={48} value={String(f.value ?? "")} disabled={!canEdit} onChange={(e) => f.onChange(e.target.value)} className={control} />} />
              </div>
              <div>
                <span className={subLabel}>{t("fields.textColour")}</span>
                {colourBox({ path: "appearance.textColour" })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
