"use client";

import { FileText, Film, Trash2, Upload } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { MediaDto, TenantDto } from "@/types/api";
import { TenantSelect } from "@/components/admin/TenantSelect";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { UiLocale } from "@/i18n/config";
import { adminMediaUrl, media } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Media library grid with upload (POST /media) and delete (DELETE /media/:id). Listing comes from the server page. */
export function MediaLibrary({ items, canManage, initialTenantId }: { items: MediaDto[]; canManage: boolean; initialTenantId?: string }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale() as UiLocale;
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tenantId, setTenantId] = useState(initialTenantId ?? "");
  const [tenant, setTenant] = useState<TenantDto | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<MediaDto | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0 || !tenantId) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) await media.upload(file, { tenantId });
      router.push(`/admin/media?tenantId=${tenantId}`);
      router.refresh();
    } catch (err) {
      setError(isApiError(err) ? err.message : tc("errorGeneric"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const remove = () =>
    start(async () => {
      if (!toDelete) return;
      try {
        await media.remove(toDelete.id);
        setToDelete(null);
        router.refresh();
      } catch (err) {
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <div className="grid gap-5">
      {canManage && (
        <div className="grid gap-4 rounded-card border border-line bg-surface p-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <TenantSelect
            label={t("mediaUi.website")}
            value={tenantId}
            onChange={(id, tn) => {
              setTenantId(id);
              setTenant(tn);
              router.push(id ? `/admin/media?tenantId=${id}` : "/admin/media");
            }}
          />
          <div>
            <input ref={inputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,application/pdf" className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <Button disabled={!tenantId} loading={uploading} onClick={() => inputRef.current?.click()}>
              <Upload className="size-4" aria-hidden /> {t("mediaUi.upload")}
            </Button>
          </div>
          <p className="text-xs text-muted sm:col-span-2">{t("mediaUi.hint", { name: tenant?.nameEn ?? "—" })}</p>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-8 text-center text-muted">{tc("noResults")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <li key={m.id} className="group overflow-hidden rounded-card border border-line bg-surface">
              <a href={adminMediaUrl(m.id)} target="_blank" rel="noopener" className="block aspect-square bg-surface-table">
                {m.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin-only media served by the backend
                  <img src={adminMediaUrl(m.id)} alt={m.altEn ?? m.originalName} className="size-full object-cover" loading="lazy" />
                ) : (
                  <span className="flex size-full items-center justify-center text-muted">{m.kind === "VIDEO" ? <Film className="size-10" aria-hidden /> : <FileText className="size-10" aria-hidden />}</span>
                )}
              </a>
              <div className="p-2.5">
                <p className="truncate text-xs font-semibold text-ink" title={m.originalName}>
                  {m.originalName}
                </p>
                <p className="text-[11px] text-muted">
                  {size(m.sizeBytes)} · {formatDate(m.createdAt, locale)}
                </p>
                {canManage && (
                  <button type="button" onClick={() => setToDelete(m)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-danger hover:underline">
                    <Trash2 className="size-3" aria-hidden /> {tc("delete")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title={tc("delete")}
        closeLabel={tc("close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              {tc("delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{t("mediaUi.deleteConfirm", { name: toDelete?.originalName ?? "" })}</p>
      </Dialog>
    </div>
  );
}
