"use client";

import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  Cloud,
  Gauge,
  ImageIcon,
  Info,
  LayoutList,
  Link2,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  Plus,
  Trash2,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
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
import { NestedItems } from "./NestedItems";

/** Header icon per section (Figma tints each card header with a green icon tile). */
const SECTION_ICONS: Record<string, LucideIcon> = {
  hero: ImageIcon,
  "quick-stats": BarChart3,
  welcome: Info,
  "about-cards": Info,
  leaders: Users,
  "quick-links": Link2,
  "sarpanch-message": MessageSquare,
  "monthly-metrics": TrendingUp,
  "village-progress": Gauge,
  "ward-details": MapIcon,
  achievements: Trophy,
  weather: Cloud,
  "whats-new": Megaphone,
};

/** Switch used for "Show this section" (Figma toggle). */
function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-ink">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition-colors disabled:opacity-50", checked ? "bg-primary" : "bg-track")}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
      {label}
    </label>
  );
}

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
  const one = (key: string) => (t.has(`itemOne.${key}`) ? t(`itemOne.${key}`) : t(`fields.${key}`));
  const SectionIcon = SECTION_ICONS[spec.key] ?? LayoutList;
  // Item rows render as a table: ordinal, one column per field (images wider), row actions.
  const itemFields = spec.items?.fields ?? [];
  const columns = `2rem ${itemFields.map((f) => (f.type === "image" ? "minmax(10rem,11rem)" : f.type === "bilingual" || f.type === "bilingualLong" ? "minmax(10rem,1.6fr)" : "minmax(5.5rem,1fr)")).join(" ")} 6.5rem`;

  return (
    <section className="rounded-card border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex items-center gap-3 text-left">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-success-soft text-primary">
            <SectionIcon className="size-5" aria-hidden />
          </span>
          <span>
            <span className="block text-[17px] font-bold text-ink">{t(`sections.${spec.labelKey}`)}</span>
            {spec.descriptionKey && <span className="block text-xs text-muted">{t(`sections.${spec.descriptionKey}`)}</span>}
          </span>
          <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        <div className="flex flex-wrap items-center gap-3">
          {published && <StatusPill status="PUBLISHED" label={`${ta("contentStatus.PUBLISHED")} v${published.version}`} />}
          {draft && <StatusPill status={draft.status} label={`${ta("contentStatus." + draft.status)} v${draft.version}`} />}
          {!draft && !published && <span className="text-xs text-muted">{t("noContent")}</span>}
          {spec.items && canEdit && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={items.fields.length >= spec.items.max}
              onClick={() => {
                setOpen(true);
                items.append(emptyItem(spec) as never);
              }}
            >
              <Plus className="size-4" aria-hidden /> {t("addNew", { name: one(spec.items.labelKey) })}
            </Button>
          )}
          <Switch checked={isVisible} onChange={setIsVisible} disabled={!canEdit} label={t("showSection")} />
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

            {spec.items?.children && <NestedItems control={control} tenantId={tenantId} spec={spec.items} errors={fieldErrors} canEdit={canEdit} rows={items} />}

            {spec.items && !spec.items.children && (
              <div className="overflow-x-auto">
                <div className="min-w-[44rem]">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      {t(`fields.${spec.items.labelKey}`)} ({items.fields.length}/{spec.items.max})
                    </p>
                  </div>
                  {fieldErrors[itemsName] && (
                    <p role="alert" className="mb-2 text-xs text-danger">
                      {fieldErrors[itemsName]}
                    </p>
                  )}
                  <div role="row" className="grid items-center gap-3 rounded-input bg-surface-soft px-3 py-2 text-[11px] font-semibold tracking-wide text-muted uppercase" style={{ gridTemplateColumns: columns }}>
                    <span>{t("order")}</span>
                    {itemFields.map((f) => (
                      <span key={f.name}>{t(`fields.${f.labelKey}`)}</span>
                    ))}
                    <span className="text-right">{tc("actions")}</span>
                  </div>
                  <ol>
                    {items.fields.map((row, i) => (
                      <li key={row.id} role="row" className="grid items-start gap-3 border-b border-line px-3 py-3 last:border-b-0" style={{ gridTemplateColumns: columns }}>
                        <span className="pt-2.5 text-sm font-semibold text-muted">{i + 1}</span>
                        {itemFields.map((f) => (
                          <FieldInput key={f.name} compact spec={f} path={`${itemsName}.${i}.${f.name}`} control={control} tenantId={tenantId} error={fieldErrors[`${itemsName}.${i}.${f.name}`]} />
                        ))}
                        <div className="flex items-center justify-end gap-1 pt-1.5">
                          <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => items.move(i, i - 1)} className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-40">
                            <ArrowUp className="size-4" aria-hidden />
                          </button>
                          <button type="button" aria-label={t("moveDown")} disabled={i === items.fields.length - 1} onClick={() => items.move(i, i + 1)} className="rounded p-1 text-muted hover:bg-surface-soft disabled:opacity-40">
                            <ArrowDown className="size-4" aria-hidden />
                          </button>
                          <button type="button" aria-label={tc("delete")} onClick={() => items.remove(i)} className="rounded p-1 text-danger hover:bg-danger-soft">
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {canEdit && (
                    <button
                      type="button"
                      disabled={items.fields.length >= spec.items.max}
                      onClick={() => items.append(emptyItem(spec) as never)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-input border border-dashed border-primary/40 py-3 text-sm font-semibold text-primary hover:bg-success-soft disabled:opacity-40"
                    >
                      <Plus className="size-4" aria-hidden /> {t("addNew", { name: one(spec.items.labelKey) })}
                    </button>
                  )}
                </div>
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
