"use client";

import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Role, TenantStatus } from "@/types/api";
import { Select } from "@/components/ui/Select";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export interface AccessUnit {
  id: string;
  nameEn: string;
  nameMr: string;
  path: string;
}
export interface AccessWebsite extends AccessUnit {
  status: TenantStatus;
}

const labelCls = "text-[11px] font-semibold tracking-wide text-muted uppercase";

/**
 * Figma "Assign Access": the district and taluka / block a block admin manages, and the Gram Panchayat websites that
 * come with it. Access is granted per area (POST /users/:id/assignments), so every created website under the chosen
 * area is included; the list shows what the area covers. Saving swaps the previous area assignment for the new one.
 */
export function AssignAccess({
  userId,
  role,
  districts,
  areas,
  websites,
  current,
}: {
  userId: string;
  role: Extract<Role, "BLOCK_ADMIN" | "TALUKA_ADMIN">;
  districts: AccessUnit[];
  areas: AccessUnit[];
  websites: AccessWebsite[];
  /** The caller's target user's active assignment of this role, if any. */
  current: { assignmentId: string; unitId: string } | null;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const ui = useLocale() as UiLocale;
  const name = (u: { nameEn: string; nameMr: string }) => pickText(pair(u.nameEn, u.nameMr), ui, u.nameEn);

  const currentArea = areas.find((a) => a.id === current?.unitId);
  const initialDistrict = districts.find((d) => currentArea?.path.includes(`/${d.id}/`)) ?? districts[0];
  const [districtId, setDistrictId] = useState(initialDistrict?.id ?? "");
  const [areaId, setAreaId] = useState(currentArea?.id ?? "");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const district = districts.find((d) => d.id === districtId);
  const areaOptions = areas.filter((a) => !districtId || a.path.includes(`/${districtId}/`));
  const area = areas.find((a) => a.id === areaId);
  const covered = area ? websites.filter((w) => w.path.includes(`/${area.id}/`)) : [];
  const needle = q.trim().toLowerCase();
  const shown = covered.filter((w) => !needle || w.nameEn.toLowerCase().includes(needle) || w.nameMr.toLowerCase().includes(needle));
  const statusCls: Record<TenantStatus, string> = { PUBLISHED: "bg-success-soft text-success", DRAFT: "bg-warning-soft text-warning", SUSPENDED: "bg-danger-soft text-danger" };

  const save = () =>
    start(async () => {
      setError(null);
      if (!area) return setError(tc("required"));
      try {
        if (current?.unitId !== area.id) {
          await users.addAssignment(userId, { role, unitId: area.id });
          if (current) await users.revokeAssignment(userId, current.assignmentId);
        }
        router.push(`/admin/users/${userId}`);
        router.refresh();
      } catch (err) {
        setError(isApiError(err) ? err.message : err instanceof Error ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <div className="grid gap-5">
      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="text-[17px] font-bold text-ink">{t("users.adminAssignment")}</h2>
        <div className="mt-3 flex flex-wrap items-end gap-4">
          <div className="min-w-[220px] flex-1">
            <Select
              label={t("topbar.district")}
              value={districtId}
              onChange={(e) => {
                setDistrictId(e.target.value);
                setAreaId("");
              }}
              options={districts.map((d) => ({ value: d.id, label: name(d) }))}
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <Select
              label={t("users.talukaBlock")}
              value={areaId}
              placeholder={areaOptions.length === 0 ? t("picker.none") : t("picker.choose")}
              onChange={(e) => setAreaId(e.target.value)}
              options={areaOptions.map((a) => ({ value: a.id, label: name(a) }))}
            />
          </div>
          <p className="mb-2 rounded-pill bg-success-soft px-4 py-1.5 text-[11px] font-semibold text-primary">{t("users.gpAvailable", { n: covered.length })}</p>
        </div>
        {district && area && <p className="sr-only">{`${name(district)} / ${name(area)}`}</p>}
      </section>

      <section className="rounded-card border border-line bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-bold text-ink">{t("users.gpAccessTitle")}</h2>
            <p className="mt-1 text-xs text-muted">{t("users.gpAccessHint")}</p>
            <label className="mt-3 flex items-center gap-2 text-sm font-medium text-ink" title={t("users.accessByArea")}>
              <input type="checkbox" checked={covered.length > 0} disabled readOnly className="size-4 accent-primary" />
              {t("users.selectAllCreated")}
            </label>
          </div>
          <label className="w-full max-w-sm">
            <span className={cn(labelCls, "mb-1.5 block")}>{t("users.searchGp")}</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("users.enterGpName")} className="h-11 w-full rounded-card border border-line-strong bg-surface px-3 text-sm text-ink outline-none focus:border-primary" />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted">{t("users.accessByArea")}</p>

        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {shown.map((w) => (
            <li key={w.id} className="flex items-center gap-3 rounded-card border border-line bg-surface-soft px-4 py-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded border border-primary bg-primary text-white" aria-hidden>
                <Check className="size-3.5" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-ink">{name(w)}</span>
                <span className="block text-[11px] text-muted">{[district && name(district), area && name(area)].filter(Boolean).join(" • ")}</span>
              </span>
              <span className={cn("rounded-pill px-3.5 py-1 text-[11px] font-semibold", statusCls[w.status])}>{t(`users.siteStatus.${w.status}`)}</span>
            </li>
          ))}
        </ul>
        {shown.length === 0 && <p className="mt-6 rounded-card bg-surface-soft px-4 py-8 text-center text-sm text-muted">{area ? tc("noResults") : t("users.pickAreaHint")}</p>}

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={save} disabled={pending || !area} className="inline-flex h-12 items-center rounded-button bg-primary px-10 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60">
            {pending ? tc("saving") : t("users.saveContinue")}
          </button>
        </div>
      </section>
    </div>
  );
}
