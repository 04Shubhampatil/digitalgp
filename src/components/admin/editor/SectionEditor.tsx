"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { ContentStatus, PageSectionDto } from "@/types/api";
import type { SectionEditorSpec } from "@/config/section-editors";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { StatusPill } from "@/components/ui/StatusPill";
import { Textarea } from "@/components/ui/Textarea";
import { EDITABLE_STATUSES, SECTION_ACTIONS, WORKFLOW_ACTIONS, sections, type SectionAction } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { emptyItem, requiredErrors, toApiData, toFormValues, type FormRecord } from "@/lib/section-data";
import { FieldInput } from "./FieldInput";

export interface SectionEditorProps {
  tenantId: string;
  pageKey: string;
  spec: SectionEditorSpec;
  section: PageSectionDto;
  capabilities: string[];
  defaultOpen?: boolean;
}

/**
 * One collapsible section card (Figma "SectionCard" with the "Show this section" toggle):
 * form from the editor spec → PUT …/draft, discard → DELETE …/draft, workflow → POST …/:action.
 * Editable only while the draft is DRAFT/REJECTED (or there is no draft yet).
 */
export function SectionEditor({ tenantId, pageKey, spec, section, capabilities, defaultOpen = false }: SectionEditorProps) {
  const t = useTranslations("editor");
  const ta = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [noteFor, setNoteFor] = useState<SectionAction | null>(null);
  const [note, setNote] = useState("");

  const draft = section.draft;
  const published = section.published;
  const working = draft ?? published;
  const status: ContentStatus | null = draft?.status ?? null;
  const canEdit = capabilities.includes("content:edit") && (!draft || EDITABLE_STATUSES.includes(draft.status));
  const [isVisible, setIsVisible] = useState(section.isVisible);

  const form = useForm<FormRecord>({ defaultValues: toFormValues(spec, working?.data) });
  const { control, handleSubmit, formState } = form;
  const items = useFieldArray({ control, name: (spec.items?.name ?? "items") as never });

  const actions = SECTION_ACTIONS.filter((a) => {
    if (!draft) return false;
    const rule = WORKFLOW_ACTIONS[a];
    return rule.from.includes(draft.status) && capabilities.includes(rule.capability);
  });
  // `unpublish` acts on the published revision, not the draft.
  const canUnpublish = !!published && !draft && capabilities.includes("content:publish");

  function onSave(values: FormRecord) {
    const missing = requiredErrors(spec, values);
    if (Object.keys(missing).length) {
      setFieldErrors(Object.fromEntries(Object.entries(missing).map(([k]) => [k, tc("required")])));
      return;
    }
    setFieldErrors({});
    setMessage(null);
    start(async () => {
      try {
        await sections.saveDraft(tenantId, pageKey, spec.key, { data: toApiData(spec, values), isVisible });
        setMessage({ kind: "ok", text: t("savedDraft") });
        router.refresh();
      } catch (err) {
        if (isApiError(err, "VALIDATION_ERROR")) {
          setFieldErrors(Object.fromEntries(err.issues.map((i) => [i.path.replace(/^data\./, ""), i.message])));
          setMessage({ kind: "error", text: err.message });
        } else setMessage({ kind: "error", text: err instanceof Error ? err.message : tc("errorGeneric") });
      }
    });
  }

  const discard = () =>
    start(async () => {
      try {
        const next = await sections.discardDraft(tenantId, pageKey, spec.key);
        form.reset(toFormValues(spec, next.published?.data));
        setMessage({ kind: "ok", text: t("discarded") });
        router.refresh();
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : tc("errorGeneric") });
      }
    });

  const run = (action: SectionAction, withNote?: string) =>
    start(async () => {
      setMessage(null);
      try {
        await sections.transition(tenantId, pageKey, spec.key, action, withNote ?? null);
        setNoteFor(null);
        setNote("");
        router.refresh();
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : tc("errorGeneric") });
      }
    });

  const itemsName = spec.items?.name ?? "items";

  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-2 text-left">
          <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
          <span>
            <span className="block text-[17px] font-bold text-ink">{t(`sections.${spec.labelKey}`)}</span>
            {spec.descriptionKey && <span className="block text-xs text-muted">{t(`sections.${spec.descriptionKey}`)}</span>}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {published && <StatusPill status="PUBLISHED" label={`${ta("contentStatus.PUBLISHED")} v${published.version}`} />}
          {draft && <StatusPill status={draft.status} label={`${ta("contentStatus." + draft.status)} v${draft.version}`} />}
          {!draft && !published && <span className="text-xs text-muted">{t("noContent")}</span>}
          <label className="flex items-center gap-2 text-xs font-semibold text-ink">
            <input type="checkbox" className="size-4 accent-primary" checked={isVisible} disabled={!canEdit} onChange={(e) => setIsVisible(e.target.checked)} />
            {t("showSection")}
          </label>
        </div>
      </header>

      {open && (
        <form onSubmit={handleSubmit(onSave)} noValidate className="border-t border-line px-5 py-5">
          {draft?.reviewNote && (
            <p className="mb-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{ta("announcements.reviewNote")}: </span>
              {draft.reviewNote}
            </p>
          )}
          {!canEdit && status && (
            <p className="mb-4 text-sm text-muted">{ta("announcements.locked", { status: ta(`contentStatus.${status}`) })}</p>
          )}

          <fieldset disabled={!canEdit || pending} className="grid gap-4">
            {spec.fields.map((f) => (
              <FieldInput key={f.name} spec={f} path={f.name} control={control} tenantId={tenantId} error={fieldErrors[f.name]} />
            ))}
            {spec.groups?.map((g) => (
              <div key={g.name} className="rounded-input border border-line p-4">
                <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">{t(`fields.${g.labelKey}`)}</p>
                <div className="grid gap-3">
                  {g.fields.map((f) => (
                    <FieldInput key={f.name} spec={f} path={`${g.name}.${f.name}`} control={control} tenantId={tenantId} error={fieldErrors[`${g.name}.${f.name}`]} />
                  ))}
                </div>
              </div>
            ))}

            {spec.items && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {t(`fields.${spec.items.labelKey}`)} ({items.fields.length}/{spec.items.max})
                  </p>
                  <Button type="button" size="sm" variant="secondary" disabled={items.fields.length >= spec.items.max} onClick={() => items.append(emptyItem(spec) as never)}>
                    <Plus className="size-4" aria-hidden /> {t("addItem")}
                  </Button>
                </div>
                {fieldErrors[itemsName] && (
                  <p role="alert" className="mb-2 text-xs text-danger">
                    {fieldErrors[itemsName]}
                  </p>
                )}
                <ol className="grid gap-3">
                  {items.fields.map((row, i) => (
                    <li key={row.id} className="rounded-input border border-line bg-canvas p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted">#{i + 1}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => items.move(i, i - 1)} className="rounded p-1 text-muted hover:bg-surface disabled:opacity-40">
                            <ArrowUp className="size-4" aria-hidden />
                          </button>
                          <button type="button" aria-label={t("moveDown")} disabled={i === items.fields.length - 1} onClick={() => items.move(i, i + 1)} className="rounded p-1 text-muted hover:bg-surface disabled:opacity-40">
                            <ArrowDown className="size-4" aria-hidden />
                          </button>
                          <button type="button" aria-label={tc("delete")} onClick={() => items.remove(i)} className="rounded p-1 text-danger hover:bg-danger-soft">
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        {spec.items!.fields.map((f) => (
                          <FieldInput key={f.name} spec={f} path={`${itemsName}.${i}.${f.name}`} control={control} tenantId={tenantId} error={fieldErrors[`${itemsName}.${i}.${f.name}`]} />
                        ))}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </fieldset>

          {message && (
            <p role={message.kind === "error" ? "alert" : "status"} className={cn("mt-4 rounded-input px-4 py-3 text-sm", message.kind === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
              {message.text}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant={a === "publish" || a === "approve" || a === "submit" ? "primary" : a === "reject" ? "danger" : "secondary"}
                  loading={pending}
                  onClick={() => (a === "reject" ? setNoteFor(a) : run(a))}
                >
                  {ta(`announcements.action.${a}`)}
                </Button>
              ))}
              {canUnpublish && (
                <Button type="button" size="sm" variant="secondary" loading={pending} onClick={() => run("unpublish")}>
                  {ta("announcements.action.unpublish")}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {draft && canEdit && (
                <Button type="button" size="sm" variant="ghost" loading={pending} onClick={discard}>
                  {t("discardDraft")}
                </Button>
              )}
              {canEdit && (
                <Button type="submit" size="sm" loading={pending || formState.isSubmitting}>
                  {t("saveDraft")}
                </Button>
              )}
            </div>
          </div>
        </form>
      )}

      <Dialog
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        title={ta("announcements.action.reject")}
        closeLabel={tc("close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteFor(null)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} disabled={!note.trim()} onClick={() => noteFor && run(noteFor, note.trim())}>
              {ta("announcements.action.reject")}
            </Button>
          </>
        }
      >
        <Textarea label={ta("announcements.rejectNote")} value={note} onChange={(e) => setNote(e.target.value)} rows={4} required />
      </Dialog>
    </section>
  );
}
