"use client";

import { Crop, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Controller, useFieldArray, type Control } from "react-hook-form";
import type { FieldSpec, SectionEditorSpec } from "@/config/section-editors";
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

function Wireframe({ kind }: { kind: (typeof LAYOUTS)[number] }) {
  const img = "bg-[#dfe3ea]";
  if (kind === "full-background") return <span className={cn("block h-14 w-28", img)} />;
  if (kind === "framed-image") return <span className="flex h-14 w-32 items-center justify-center border border-line bg-surface"><span className={cn("block h-10 w-24 rounded-[3px]", img)} /></span>;
  return (
    <span className={cn("flex h-14 w-32 border border-line bg-surface", kind === "image-left" && "flex-row-reverse")}>
      <span className="w-1/2" />
      <span className={cn("w-1/2", img)} />
    </span>
  );
}

export function BannerFields({ spec, control: ctl, tenantId, errors, canEdit }: { spec: SectionEditorSpec; control: Control<FormRecord>; tenantId: string; errors: Record<string, string>; canEdit: boolean }) {
  const t = useTranslations("editor");
  const field = (name: string): FieldSpec => spec.fields.find((f) => f.name === name)!;
  const group = (name: string, fieldName: string): FieldSpec => spec.groups!.find((g) => g.name === name)!.fields.find((f) => f.name === fieldName)!;
  const ctas = useFieldArray({ control: ctl, name: "ctas" as never });
  const ctaSpec = spec.items!;
  const ctaField = (name: string) => ctaSpec.fields.find((f) => f.name === name)!;
  const opt = (v: string) => (t.has(`options.${v}`) ? t(`options.${v}`) : v);

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
                  <Wireframe kind={l} />
                  {opt(l)}
                </button>
              ))}
            </div>
          )}
        />
        {errors.layout && <p className="mt-2 text-xs text-danger">{errors.layout}</p>}
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
