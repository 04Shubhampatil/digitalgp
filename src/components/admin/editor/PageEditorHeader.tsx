"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/** Event the "Save Changes" button sends; every section editor with unsaved edits listens and saves its draft. */
export const SAVE_ALL_EVENT = "admin:save-all";
/** Sent by a section editor when it finishes saving, so the header can show the result. */
export const SAVED_EVENT = "admin:section-saved";

/**
 * Page title row from the design: title and description on the left, "Published · last edited" status and the
 * primary "Save Changes" button on the right. Saving writes a draft of every changed section.
 */
export function PageEditorHeader({ title, description, published, lastEdited, actions }: { title: string; description: string; published: boolean; lastEdited: string; actions?: ReactNode }) {
  const t = useTranslations("editor");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let pending = 0;
    let failed = false;
    const onSaved = (e: Event) => {
      const ok = (e as CustomEvent<{ ok: boolean }>).detail?.ok !== false;
      if (!ok) failed = true;
      pending = Math.max(0, pending - 1);
      if (pending === 0) {
        setSaving(false);
        setDone(failed ? t("saveFailed") : t("allSaved"));
        failed = false;
      }
    };
    const onStart = (e: Event) => {
      pending = (e as CustomEvent<{ count: number }>).detail?.count ?? 0;
    };
    window.addEventListener(SAVED_EVENT, onSaved);
    window.addEventListener("admin:save-started", onStart);
    return () => {
      window.removeEventListener(SAVED_EVENT, onSaved);
      window.removeEventListener("admin:save-started", onStart);
    };
  }, [t]);

  function saveAll() {
    setDone(null);
    setSaving(true);
    const counter = { count: 0 };
    window.dispatchEvent(new CustomEvent(SAVE_ALL_EVENT, { detail: counter }));
    if (counter.count === 0) {
      setSaving(false);
      setDone(t("nothingToSave"));
    } else window.dispatchEvent(new CustomEvent("admin:save-started", { detail: { count: counter.count } }));
  }

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[26px] leading-8 font-bold text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <p className="flex items-center gap-2 text-xs text-muted">
          <span aria-hidden className={published ? "size-2 rounded-full bg-success" : "size-2 rounded-full bg-warning"} />
          {published ? t("statusPublished") : t("statusDraft")}
          {lastEdited && <span> · {lastEdited}</span>}
        </p>
        {actions}
        <Button type="button" onClick={saveAll} loading={saving}>
          <Save className="size-4" aria-hidden /> {t("saveChanges")}
        </Button>
      </div>
      {done && (
        <p role="status" className="w-full text-right text-xs text-muted">
          {done}
        </p>
      )}
    </div>
  );
}
