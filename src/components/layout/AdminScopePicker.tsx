"use client";

import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AdminUnitDto } from "@/types/api";
import { hierarchy } from "@/lib/api/admin";

export interface ScopeLabels {
  district: string;
  taluka: string;
  gramPanchayat: string;
}

/**
 * Top-bar District / Taluka / Gram Panchayat boxes. They are real dropdowns: choosing a district or taluka filters the
 * GP Websites list, choosing a Gram Panchayat opens its website dashboard (or finds it in the list when no website exists
 * yet). The units come from GET /hierarchy/units, which only returns what the signed-in user may see.
 */
export function AdminScopePicker({ labels, locale }: { labels: ScopeLabels; locale: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [units, setUnits] = useState<{ districts: AdminUnitDto[]; talukas: AdminUnitDto[]; gps: AdminUnitDto[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      hierarchy.list({ level: "DISTRICT", limit: 100 }),
      hierarchy.list({ level: "TALUKA", limit: 100 }),
      hierarchy.list({ level: "GRAM_PANCHAYAT", limit: 100 }),
    ])
      .then(([d, t, g]) => {
        if (!cancelled) setUnits({ districts: d.data, talukas: t.data, gps: g.data });
      })
      .catch(() => {
        if (!cancelled) setUnits({ districts: [], talukas: [], gps: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const name = (u: AdminUnitDto) => (locale === "mr" && u.nameMr ? u.nameMr : u.nameEn);
  const district = sp.get("district") ?? "";
  const taluka = sp.get("taluka") ?? "";

  const talukas = useMemo(() => (units?.talukas ?? []).filter((u) => !district || u.path.includes(`/${district}/`)), [units, district]);
  const gps = useMemo(
    () => (units?.gps ?? []).filter((u) => (!district || u.path.includes(`/${district}/`)) && (!taluka || u.path.includes(`/${taluka}/`))),
    [units, district, taluka],
  );

  const go = (q: Record<string, string>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v) p.set(k, v);
    const s = p.toString();
    router.push(s ? `/admin/websites?${s}` : "/admin/websites");
  };

  // From 1024px the three boxes share the room that is left (so the language switch and the profile never get cut off); 110px each from 1280px.
  const box = "relative hidden h-9 min-w-0 max-w-[160px] flex-1 items-center rounded-[4px] border border-line-strong bg-surface text-xs text-ink focus-within:border-primary lg:flex xl:min-w-[110px] xl:flex-none";
  const select = "h-full w-full cursor-pointer appearance-none truncate rounded-[4px] bg-transparent pr-8 pl-3 text-xs outline-none disabled:cursor-default disabled:opacity-60";
  const chevron = <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 size-3.5 shrink-0 text-muted" />;

  return (
    <>
      <label className={box} title={labels.district}>
        <span className="sr-only">{labels.district}</span>
        <select value={district} disabled={!units} onChange={(e) => go({ district: e.target.value })} className={select}>
          <option value="">{labels.district}</option>
          {(units?.districts ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {name(u)}
            </option>
          ))}
        </select>
        {chevron}
      </label>
      <label className={box} title={labels.taluka}>
        <span className="sr-only">{labels.taluka}</span>
        <select value={taluka} disabled={!units} onChange={(e) => go({ district, taluka: e.target.value })} className={select}>
          <option value="">{labels.taluka}</option>
          {talukas.map((u) => (
            <option key={u.id} value={u.id}>
              {name(u)}
            </option>
          ))}
        </select>
        {chevron}
      </label>
      <label className={box} title={labels.gramPanchayat}>
        <span className="sr-only">{labels.gramPanchayat}</span>
        <select
          value=""
          disabled={!units}
          onChange={(e) => {
            const gp = gps.find((u) => u.id === e.target.value);
            if (!gp) return;
            if (gp.tenantId) router.push(`/admin/websites/${gp.tenantId}`);
            else go({ district, taluka, q: gp.nameEn });
          }}
          className={select}
        >
          <option value="">{labels.gramPanchayat}</option>
          {gps.map((u) => (
            <option key={u.id} value={u.id}>
              {name(u)}
            </option>
          ))}
        </select>
        {chevron}
      </label>
    </>
  );
}
