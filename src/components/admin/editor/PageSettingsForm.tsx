"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PageDto } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { sections } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { MediaField } from "./MediaField";

/** Page-level settings (enabled + SEO) → PATCH /content/:tenantId/pages/:pageKey (tenant:update). */
export function PageSettingsForm({ page, canUpdate }: { page: PageDto; canUpdate: boolean }) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [values, setValues] = useState({
    isEnabled: page.isEnabled,
    seoTitleEn: page.seoTitleEn ?? "",
    seoTitleMr: page.seoTitleMr ?? "",
    seoDescriptionEn: page.seoDescriptionEn ?? "",
    seoDescriptionMr: page.seoDescriptionMr ?? "",
    shareImageId: page.shareImageId ?? "",
  });
  const set = <K extends keyof typeof values>(k: K, v: (typeof values)[K]) => setValues((s) => ({ ...s, [k]: v }));

  const save = () =>
    start(async () => {
      setMessage(null);
      try {
        await sections.updatePage(page.tenantId, page.pageKey, {
          isEnabled: values.isEnabled,
          seoTitleEn: values.seoTitleEn || null,
          seoTitleMr: values.seoTitleMr || null,
          seoDescriptionEn: values.seoDescriptionEn || null,
          seoDescriptionMr: values.seoDescriptionMr || null,
          shareImageId: values.shareImageId || null,
        });
        setMessage({ kind: "ok", text: tc("saved") });
        router.refresh();
      } catch (err) {
        setMessage({ kind: "error", text: isApiError(err) ? err.message : tc("errorGeneric") });
      }
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="rounded-card border border-line bg-surface p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-ink">{t("pageSettings")}</h2>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" className="size-4 accent-primary" checked={values.isEnabled} disabled={!canUpdate} onChange={(e) => set("isEnabled", e.target.checked)} />
          {t("pageEnabled")}
        </label>
      </div>
      <fieldset disabled={!canUpdate || pending} className="grid gap-4 sm:grid-cols-2">
        <Input label={`${t("seoTitle")} · English`} maxLength={200} value={values.seoTitleEn} onChange={(e) => set("seoTitleEn", e.target.value)} />
        <Input label={`${t("seoTitle")} · मराठी`} lang="mr" maxLength={200} value={values.seoTitleMr} onChange={(e) => set("seoTitleMr", e.target.value)} />
        <Textarea label={`${t("seoDescription")} · English`} rows={3} maxLength={500} value={values.seoDescriptionEn} onChange={(e) => set("seoDescriptionEn", e.target.value)} />
        <Textarea label={`${t("seoDescription")} · मराठी`} lang="mr" rows={3} maxLength={500} value={values.seoDescriptionMr} onChange={(e) => set("seoDescriptionMr", e.target.value)} />
        <div className="sm:col-span-2">
          <MediaField label={t("shareImage")} value={values.shareImageId} onChange={(id) => set("shareImageId", id)} tenantId={page.tenantId} disabled={!canUpdate} />
        </div>
      </fieldset>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={cn("mt-4 rounded-input px-4 py-3 text-sm", message.kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
          {message.text}
        </p>
      )}
      {canUpdate && (
        <div className="mt-4 flex justify-end">
          <Button type="submit" size="sm" loading={pending}>
            {tc("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
