"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TenantSelect } from "@/components/admin/TenantSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { schemeCoverage } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

type Row = { wardNo: string; households: string; beneficiaries: string };

/**
 * Ward coverage of one scheme on one website (aggregate counts only, no personal data):
 * GET / PUT /content/:tenantId/scheme-coverage/:schemeId. The PUT replaces the whole list.
 * Shared schemes carry separate coverage per website, so the caller picks the website first.
 */
export function SchemeCoverageEditor({ schemeId, tenantId: fixedTenant, canEdit }: { schemeId: string; tenantId: string | null; canEdit: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [tenantId, setTenantId] = useState(fixedTenant ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  // Website whose coverage is in `rows` (loading while it differs from the chosen one).
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loading = !!tenantId && loadedFor !== tenantId;
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    schemeCoverage
      .get(tenantId, schemeId)
      .then((c) => {
        if (cancelled) return;
        setRows(c.wards.map((w) => ({ wardNo: w.wardNo, households: String(w.households), beneficiaries: w.beneficiaries === null ? "" : String(w.beneficiaries) })));
        setMessage(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setMessage({ ok: false, text: isApiError(err) ? err.message : tc("errorGeneric") });
      })
      .finally(() => !cancelled && setLoadedFor(tenantId));
    return () => {
      cancelled = true;
    };
  }, [tenantId, schemeId, tc]);

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const invalid = rows.some((r) => !r.wardNo.trim() || !/^\d+$/.test(r.households.trim()) || !/^\d*$/.test(r.beneficiaries.trim()));
  const duplicate = new Set(rows.map((r) => r.wardNo.trim())).size !== rows.length;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await schemeCoverage.put(
        tenantId,
        schemeId,
        rows.map((r) => ({ wardNo: r.wardNo.trim(), households: Number(r.households), beneficiaries: r.beneficiaries.trim() ? Number(r.beneficiaries) : null })),
      );
      setRows(saved.wards.map((w) => ({ wardNo: w.wardNo, households: String(w.households), beneficiaries: w.beneficiaries === null ? "" : String(w.beneficiaries) })));
      setMessage({ ok: true, text: t("schemesUi.coverageSaved") });
    } catch (err) {
      setMessage({ ok: false, text: isApiError(err) ? err.message : tc("errorGeneric") });
    } finally {
      setSaving(false);
    }
  }

  const totalHouseholds = rows.reduce((n, r) => n + (Number(r.households) || 0), 0);
  const anyBeneficiaries = rows.some((r) => r.beneficiaries.trim());
  const totalBeneficiaries = rows.reduce((n, r) => n + (Number(r.beneficiaries) || 0), 0);

  return (
    <div className="grid gap-4 px-5 pb-5">
      {!fixedTenant && (
        <div className="max-w-md">
          <TenantSelect label={t("announcements.tenant")} value={tenantId} onChange={(id) => setTenantId(id)} />
        </div>
      )}
      {!tenantId ? (
        <p className="text-sm text-muted">{t("schemesUi.coveragePickWebsite")}</p>
      ) : loading ? (
        <p className="text-sm text-muted">{t("picker.loading")}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="bg-surface-table text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                  <th className="px-3 py-2.5">{t("schemesUi.ward")}</th>
                  <th className="px-3 py-2.5">{t("schemesUi.households")}</th>
                  <th className="px-3 py-2.5">{t("schemesUi.wardBeneficiaries")}</th>
                  <th className="px-3 py-2.5 text-right">
                    <span className="sr-only">{tc("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted">
                      {t("schemesUi.noCoverage")}
                    </td>
                  </tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <Input compact label={t("schemesUi.ward")} value={r.wardNo} maxLength={20} disabled={!canEdit} onChange={(e) => update(i, { wardNo: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input compact label={t("schemesUi.households")} inputMode="numeric" value={r.households} disabled={!canEdit} onChange={(e) => update(i, { households: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <Input compact label={t("schemesUi.wardBeneficiaries")} inputMode="numeric" placeholder={tc("optional")} value={r.beneficiaries} disabled={!canEdit} onChange={(e) => update(i, { beneficiaries: e.target.value })} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canEdit && (
                        <button type="button" aria-label={tc("delete")} onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="inline-flex size-9 items-center justify-center rounded-button text-muted hover:bg-danger-soft hover:text-danger">
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs font-semibold text-ink">
                  <td className="px-3 py-2.5">{t("schemesUi.total")}</td>
                  <td className="px-3 py-2.5">{totalHouseholds.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2.5">{anyBeneficiaries ? totalBeneficiaries.toLocaleString("en-IN") : "—"}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          {canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, { wardNo: String(rs.length + 1), households: "0", beneficiaries: "" }])}>
                <Plus className="size-4" aria-hidden /> {t("schemesUi.addWard")}
              </Button>
              <div className="flex items-center gap-3">
                {(invalid || duplicate) && <p className="text-xs text-danger">{duplicate ? t("schemesUi.duplicateWard") : t("schemesUi.coverageInvalid")}</p>}
                <Button size="sm" loading={saving} disabled={invalid || duplicate} onClick={save}>
                  {tc("save")}
                </Button>
              </div>
            </div>
          )}
          <p className="text-xs text-muted">{t("schemesUi.coverageHint")}</p>
        </>
      )}
      {message && (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-success" : "text-sm text-danger"}>
          {message.text}
        </p>
      )}
    </div>
  );
}
