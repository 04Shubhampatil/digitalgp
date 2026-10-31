"use client";

import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  Cloud,
  Coins,
  FileText,
  Gauge,
  HelpCircle,
  Home,
  ImageIcon,
  Info,
  LayoutList,
  Leaf,
  Link2,
  Map as MapIcon,
  Megaphone,
  MessageSquare,
  Newspaper,
  Plus,
  QrCode,
  TrendingUp,
  Trophy,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { ContentStatus, PageSectionDto } from "@/types/api";
import type { FieldSpec, SectionEditorSpec } from "@/config/section-editors";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { StatusPill } from "@/components/ui/StatusPill";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { EDITABLE_STATUSES, SECTION_ACTIONS, WORKFLOW_ACTIONS, sections, type SectionAction } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { requiredErrors, toApiData, toFormValues, type FormRecord } from "@/lib/section-data";
import { FieldInput } from "./FieldInput";
import { BannerFields } from "./BannerFields";
import { ListBlock } from "./ListBlock";
import { SAVED_EVENT, SAVE_ALL_EVENT } from "./PageEditorHeader";

/** Header icon per section (Figma tints each card header with a green icon tile). */
const SECTION_ICONS: Record<string, LucideIcon> = {
  hero: ImageIcon,
  banner: ImageIcon,
  "quick-stats": BarChart3,
  "top-stats": BarChart3,
  "green-scoreboard": Trophy,
  welcome: Info,
  "about-cards": Info,
  "village-intro": Info,
  leaders: Users,
  "leader-cards": Users,
  "quick-links": Link2,
  "service-links": Link2,
  "sarpanch-message": MessageSquare,
  "feedback-form": MessageSquare,
  "complaint-form": MessageSquare,
  "monthly-metrics": TrendingUp,
  "monthly-report": TrendingUp,
  "village-progress": Gauge,
  "status-cards": Gauge,
  "ward-details": MapIcon,
  "infra-map": MapIcon,
  "office-location": MapIcon,
  achievements: Trophy,
  weather: Cloud,
  "weather-update": Cloud,
  "whats-new": Megaphone,
  "latest-announcements": Megaphone,
  "announcement-categories": Megaphone,
  "income-sources": Coins,
  expenditure: Coins,
  "budget-visualizer": BarChart3,
  documents: FileText,
  "download-forms": FileText,
  "qr-codes": QrCode,
  help: HelpCircle,
  calendar: Calendar,
  "upcoming-events": Calendar,
  "deadline-cards": Calendar,
  "tree-adoption": Leaf,
  "sustainability-initiatives": Leaf,
  "video-gallery": Video,
  "mini-documentary": Video,
  "photo-gallery": ImageIcon,
  "press-coverage": Newspaper,
  "training-programs": BookOpen,
  "youth-speak-tabs": BookOpen,
  "student-spotlight": BookOpen,
  homestay: Home,
};

/** Fields that need the full row of the form grid. */
function isWide(f: FieldSpec): boolean {
  return f.wide === true || ["bilingual", "bilingualLong", "bilingualList", "imageList", "image", "file", "multiSelect", "json"].includes(f.type) || (f.type === "select" && f.segmented === true);
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
  // The header "Add New" button appends to the primary list, which registers its append function here.
  const appendPrimary = useRef<(() => void) | null>(null);
  const registerAppend = (fn: () => void) => {
    appendPrimary.current = fn;
  };

  const actions = SECTION_ACTIONS.filter((a) => {
    if (!draft) return false;
    const rule = WORKFLOW_ACTIONS[a];
    return rule.from.includes(draft.status) && capabilities.includes(rule.capability);
  });
  // `unpublish` acts on the published revision, not the draft.
  const canUnpublish = !!published && !draft && capabilities.includes("content:publish");

  function onSave(values: FormRecord, fromHeader = false) {
    const announce = (ok: boolean) => fromHeader && window.dispatchEvent(new CustomEvent(SAVED_EVENT, { detail: { ok } }));
    const missing = requiredErrors(spec, values);
    if (Object.keys(missing).length) {
      setFieldErrors(Object.fromEntries(Object.entries(missing).map(([k]) => [k, tc("required")])));
      announce(false);
      return;
    }
    setFieldErrors({});
    setMessage(null);
    start(async () => {
      try {
        await sections.saveDraft(tenantId, pageKey, spec.key, { data: toApiData(spec, values), isVisible });
        setMessage({ kind: "ok", text: t("savedDraft") });
        router.refresh();
        announce(true);
      } catch (err) {
        if (isApiError(err, "VALIDATION_ERROR")) {
          setFieldErrors(Object.fromEntries(err.issues.map((i) => [i.path.replace(/^data\./, ""), i.message])));
          setMessage({ kind: "error", text: err.message });
        } else setMessage({ kind: "error", text: err instanceof Error ? err.message : tc("errorGeneric") });
        announce(false);
      }
    });
  }

  // The page's "Save Changes" button asks every editor with unsaved edits to save its draft.
  const dirty = formState.isDirty;
  const saveAll = useRef<() => void>(() => {});
  useEffect(() => {
    saveAll.current = () => void handleSubmit((v) => onSave(v, true))();
  });
  useEffect(() => {
    const onEvent = (ev: Event) => {
      if (!canEdit || !dirty) return;
      const counter = (ev as CustomEvent<{ count: number }>).detail;
      if (counter) counter.count += 1;
      queueMicrotask(() => saveAll.current());
    };
    window.addEventListener(SAVE_ALL_EVENT, onEvent);
    return () => window.removeEventListener(SAVE_ALL_EVENT, onEvent);
  }, [canEdit, dirty]);

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

  const one = (key: string) => (t.has(`itemOne.${key}`) ? t(`itemOne.${key}`) : t(`fields.${key}`));
  const SectionIcon = SECTION_ICONS[spec.key] ?? LayoutList;

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
              disabled={!open}
              onClick={() => appendPrimary.current?.()}
            >
              <Plus className="size-4" aria-hidden /> {t("addNew", { name: one(spec.items.labelKey) })}
            </Button>
          )}
          <Switch checked={isVisible} onChange={setIsVisible} disabled={!canEdit} label={t("showSection")} />
        </div>
      </header>

      {open && (
        <form onSubmit={handleSubmit((v) => onSave(v))} noValidate className="border-t border-line px-5 py-5">
          {draft?.reviewNote && (
            <p className="mb-4 rounded-input bg-warning-soft px-4 py-3 text-sm text-ink">
              <span className="font-semibold">{ta("announcements.reviewNote")}: </span>
              {draft.reviewNote}
            </p>
          )}
          {!canEdit && status && (
            <p className="mb-4 text-sm text-muted">{ta("announcements.locked", { status: ta(`contentStatus.${status}`) })}</p>
          )}

          <fieldset disabled={!canEdit || pending} className="grid gap-5">
            {spec.key === "banner" ? (
              <BannerFields spec={spec} control={control} tenantId={tenantId} errors={fieldErrors} canEdit={canEdit} />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {spec.fields.map((f) => (
                    <div key={f.name} className={cn(isWide(f) && "sm:col-span-2")}>
                      <FieldInput spec={f} path={f.name} control={control} tenantId={tenantId} error={fieldErrors[f.name]} />
                    </div>
                  ))}
                </div>
                {spec.groups?.map((g) => (
                  <div key={g.name} className="rounded-input border border-line p-4">
                    <p className="mb-3 text-xs font-semibold tracking-wide text-muted uppercase">{t(`fields.${g.labelKey}`)}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {g.fields.map((f) => (
                        <div key={f.name} className={cn(isWide(f) && "sm:col-span-2")}>
                          <FieldInput spec={f} path={`${g.name}.${f.name}`} control={control} tenantId={tenantId} error={fieldErrors[`${g.name}.${f.name}`]} />
                        </div>
                      ))}
                    </div>
                    {g.lists?.map((l) => (
                      <div key={l.name} className="mt-4">
                        <ListBlock control={control} tenantId={tenantId} spec={l} path={`${g.name}.${l.name}`} errors={fieldErrors} canEdit={canEdit} />
                      </div>
                    ))}
                  </div>
                ))}
                {spec.items && <ListBlock control={control} tenantId={tenantId} spec={spec.items} path={spec.items.name} errors={fieldErrors} canEdit={canEdit} onAppend={registerAppend} />}
                {spec.lists?.map((l) => (
                  <ListBlock key={l.name} control={control} tenantId={tenantId} spec={l} path={l.name} errors={fieldErrors} canEdit={canEdit} />
                ))}
              </>
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
