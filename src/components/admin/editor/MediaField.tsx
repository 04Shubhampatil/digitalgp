"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminMediaUrl, media } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

/** Image picker: shows the current media (GET /media/:id/file) and uploads a replacement (POST /media). */
export function MediaField({
  label,
  value,
  onChange,
  tenantId,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (mediaId: string) => void;
  tenantId: string;
  error?: string;
  disabled?: boolean;
}) {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const dto = await media.upload(file, { tenantId });
      onChange(dto.id);
    } catch (err) {
      setUploadError(isApiError(err) ? err.message : tc("errorGeneric"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      <div className="flex items-center gap-4 rounded-input border border-dashed border-line bg-surface p-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-only media served by the backend
          <img src={adminMediaUrl(value)} alt="" className="size-20 shrink-0 rounded-[6px] object-cover" />
        ) : (
          <span className="flex size-20 shrink-0 items-center justify-center rounded-[6px] bg-surface-table text-muted">
            <ImagePlus className="size-6" aria-hidden />
          </span>
        )}
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">{t("mediaHint")}</p>
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button type="button" size="sm" variant="secondary" loading={uploading} disabled={disabled} onClick={() => inputRef.current?.click()}>
              {value ? t("replaceImage") : t("uploadImage")}
            </Button>
            {value && (
              <Button type="button" size="sm" variant="ghost" disabled={disabled || uploading} onClick={() => onChange("")}>
                <Trash2 className="size-4" aria-hidden /> {tc("delete")}
              </Button>
            )}
          </div>
        </div>
      </div>
      {(uploadError || error) && (
        <p role="alert" className="text-xs text-danger">
          {uploadError ?? error}
        </p>
      )}
    </div>
  );
}
