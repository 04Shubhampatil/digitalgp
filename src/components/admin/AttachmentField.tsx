"use client";

import { Paperclip, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminMediaUrl, media } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

export type AttachmentScope = { tenantId: string } | { ownerUnitId: string } | null;

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf";

/** Single attachment (image or PDF) for an announcement. Uploads via POST /media in the item's scope. */
export function AttachmentField({
  label,
  value,
  onChange,
  scope,
  accept = DEFAULT_ACCEPT,
  error,
}: {
  label: string;
  value: string;
  onChange: (mediaId: string) => void;
  scope: AttachmentScope;
  accept?: string;
  error?: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file || !scope) return;
    setUploadError(null);
    setUploading(true);
    try {
      const dto = await media.upload(file, scope);
      onChange(dto.id);
    } catch (err) {
      setUploadError(isApiError(err) ? err.message : tc("errorGeneric"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      {!scope ? (
        <p className="text-xs text-muted">{t("attach.pickScopeFirst")}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-input border border-dashed border-line bg-surface p-3">
          {value ? (
            <a href={adminMediaUrl(value)} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <Paperclip className="size-4" aria-hidden /> {t("attach.open")}
            </a>
          ) : (
            <span className="text-sm text-muted">{t("attach.none")}</span>
          )}
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button type="button" size="sm" variant="secondary" loading={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" aria-hidden /> {value ? t("attach.replace") : t("attach.choose")}
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" disabled={uploading} onClick={() => onChange("")}>
              <Trash2 className="size-4" aria-hidden /> {tc("delete")}
            </Button>
          )}
        </div>
      )}
      {(uploadError || error) && (
        <p role="alert" className="text-xs text-danger">
          {uploadError ?? error}
        </p>
      )}
    </div>
  );
}
