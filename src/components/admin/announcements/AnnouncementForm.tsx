"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, Diamond } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { AnnouncementDto, AssignmentDto } from "@/types/api";
import { PAGE_KEYS, type PageKey } from "@/config/pages";
import { AttachmentField, type AttachmentScope } from "@/components/admin/AttachmentField";
import { TenantSelect } from "@/components/admin/TenantSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { UiLocale } from "@/i18n/config";
import { pair, pickText } from "@/i18n/text";
import { announcements, WORKFLOW_ACTIONS } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";

const PRIORITIES = ["NORMAL", "IMPORTANT", "URGENT", "EMERGENCY"] as const;
const TYPES = ["general", "meeting", "scheme", "notice", "event", "emergency"] as const;

const schema = z
  .object({
    kind: z.enum(["tenant", "shared"]),
    tenantId: z.string(),
    ownerUnitId: z.string(),
    category: z.string().trim().min(1).max(60),
    priority: z.enum(PRIORITIES),
    titleEn: z.string().trim().max(200),
    titleMr: z.string().trim().max(200),
    bodyEn: z.string().trim().max(20_000),
    bodyMr: z.string().trim().max(20_000),
    displayPages: z.array(z.enum(PAGE_KEYS)).min(1),
    publishAt: z.string(),
    expiresAt: z.string(),
    attachmentId: z.string(),
  })
  .refine((v) => !!(v.titleEn || v.titleMr), { message: "A title in English or Marathi is required", path: ["titleEn"] })
  .refine((v) => (v.kind === "tenant" ? !!v.tenantId : !!v.ownerUnitId), { message: "Required", path: ["tenantId"] });
type FormValues = z.infer<typeof schema>;

/** A unit the announcement can be published to (an area, or a Gram Panchayat with a created website). */
export interface TargetUnit {
  id: string;
  nameEn: string;
  nameMr: string;
  path: string;
}

/** The area the caller publishes from, the areas inside it, and the Gram Panchayats that have a website. */
export interface PublishTargets {
  ownerId: string;
  ownerNameEn: string;
  groups: TargetUnit[];
  gps: TargetUnit[];
}

export interface AnnouncementFormProps {
  assignments: AssignmentDto[];
  capabilities: string[];
  /** When set, the form edits this announcement (PATCH) instead of creating. */
  existing?: AnnouncementDto;
  /** Publishing targets for callers who may share announcements downward (block, taluka, district admins). */
  targets?: PublishTargets | null;
}

type Language = "both" | "en" | "mr";
type Done = { id: string; title: string; type: string; live: boolean; names: string[]; pages: string[] };

const labelCls = "text-[11px] font-semibold tracking-wide text-muted uppercase";
const chipBase = "inline-flex h-9 items-center justify-center gap-1.5 rounded-pill border px-4 text-xs font-semibold transition-colors";

/**
 * Figma "Publish Announcement" modal as a page: type, priority, date, content, attachment, language, pages and
 * publishing targets → POST /announcements (+ submit / approve / publish when the caller may). Shows the success card afterwards.
 */
export function AnnouncementForm({ capabilities, existing, targets }: AnnouncementFormProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const ui = useLocale() as UiLocale;
  const [formError, setFormError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>("both");
  const [done, setDone] = useState<Done | null>(null);
  const [showSelected, setShowSelected] = useState(false);

  const editing = !!existing;
  const shared = !editing && !!targets && capabilities.includes("content:share");
  const name = (u: { nameEn: string; nameMr: string }) => pickText(pair(u.nameEn, u.nameMr), ui, u.nameEn);

  // Publishing targets (create only): which areas are open and which Gram Panchayat websites are ticked.
  const groups = useMemo(() => targets?.groups ?? [], [targets]);
  const gps = useMemo(() => targets?.gps ?? [], [targets]);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(groups.length === 1 ? [groups[0]!.id] : []));
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [targetError, setTargetError] = useState(false);
  const visibleGps = groups.length === 0 ? gps : gps.filter((g) => groups.some((x) => openGroups.has(x.id) && g.path.includes(`/${x.id}/`)));
  const pickedGps = gps.filter((g) => picked.has(g.id));
  const areasPicked = groups.filter((x) => pickedGps.some((g) => g.path.includes(`/${x.id}/`))).length || (pickedGps.length ? 1 : 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: existing
      ? {
          kind: existing.tenantId ? "tenant" : "shared",
          tenantId: existing.tenantId ?? "",
          ownerUnitId: existing.tenantId ? "" : existing.ownerUnitId,
          category: existing.category,
          priority: existing.priority,
          titleEn: existing.titleEn ?? "",
          titleMr: existing.titleMr ?? "",
          bodyEn: existing.bodyEn ?? "",
          bodyMr: existing.bodyMr ?? "",
          displayPages: existing.displayPages.filter((p): p is PageKey => (PAGE_KEYS as readonly string[]).includes(p)),
          publishAt: toDateTimeLocal(existing.publishAt),
          expiresAt: toDateTimeLocal(existing.expiresAt),
          attachmentId: existing.attachmentId ?? "",
        }
      : {
          kind: shared ? "shared" : "tenant",
          tenantId: "",
          ownerUnitId: shared ? (targets?.ownerId ?? "") : "",
          category: "",
          priority: "NORMAL",
          titleEn: "",
          titleMr: "",
          bodyEn: "",
          bodyMr: "",
          displayPages: ["home", "announcements"],
          publishAt: "",
          expiresAt: "",
          attachmentId: "",
        },
  });
  const { register, handleSubmit, control, setError, reset, formState } = form;
  const kind = useWatch({ control, name: "kind" });
  const tenantId = useWatch({ control, name: "tenantId" });
  const ownerUnitId = useWatch({ control, name: "ownerUnitId" });
  const category = useWatch({ control, name: "category" });
  const attachmentScope: AttachmentScope = kind === "tenant" ? (tenantId ? { tenantId } : null) : ownerUnitId ? { ownerUnitId } : null;

  const typeOptions = [...(category && !(TYPES as readonly string[]).includes(category) ? [{ value: category, label: category }] : []), ...TYPES.map((k) => ({ value: k, label: t(`announcements.type.${k}`) }))];
  const typeLabel = (v: string) => ((TYPES as readonly string[]).includes(v) ? t(`announcements.type.${v}`) : v);
  const pagesLabel = (keys: readonly string[]) => keys.map((k) => t(`pageNames.${k}`));

  async function onSubmit(values: FormValues, mode: "draft" | "publish") {
    setFormError(null);
    if (shared && picked.size === 0) {
      setTargetError(true);
      return;
    }
    setTargetError(false);
    const base = {
      category: values.category,
      priority: values.priority,
      titleEn: values.titleEn || null,
      titleMr: values.titleMr || null,
      bodyEn: values.bodyEn || null,
      bodyMr: values.bodyMr || null,
      displayPages: values.displayPages,
      publishAt: fromDateTimeLocal(values.publishAt),
      expiresAt: fromDateTimeLocal(values.expiresAt),
      attachmentId: values.attachmentId || null,
    };
    try {
      let saved: AnnouncementDto;
      if (existing) {
        saved = await announcements.update(existing.id, base);
      } else if (values.kind === "tenant") {
        saved = await announcements.create({ ...base, tenantId: values.tenantId });
      } else {
        saved = await announcements.create({ ...base, ownerUnitId: values.ownerUnitId, targetUnitIds: [...picked] });
      }
      if (mode === "publish" && !existing) {
        // Walk the workflow as far as the caller's capabilities allow; the server re-validates every step.
        let current = saved;
        try {
          for (const action of ["submit", "approve", "publish"] as const) {
            if (!capabilities.includes(WORKFLOW_ACTIONS[action].capability)) break;
            current = await announcements.transition(current.id, action, null);
          }
        } catch {
          /* the announcement stays where the workflow stopped; the detail page shows its status */
        }
        if (current.status === "PUBLISHED") {
          setDone({
            id: current.id,
            title: (ui === "mr" ? current.titleMr || current.titleEn : current.titleEn || current.titleMr) ?? "",
            type: typeLabel(current.category),
            live: !current.publishAt || new Date(current.publishAt).getTime() <= new Date().getTime(),
            names: shared ? pickedGps.map(name) : [],
            pages: pagesLabel(current.displayPages),
          });
          router.refresh();
          return;
        }
        saved = current;
      }
      router.push(`/admin/announcements/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (isApiError(err, "VALIDATION_ERROR")) {
        for (const i of err.issues) setError((i.path in values ? i.path : "titleEn") as keyof FormValues, { message: i.message });
        return;
      }
      setFormError(err instanceof Error ? err.message : tc("errorGeneric"));
    }
  }

  if (done) {
    return (
      <section className="mx-auto max-w-xl rounded-card border border-line bg-surface px-6 py-10 text-center">
        <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-success-soft text-primary">
          <Check className="size-10" strokeWidth={2.5} aria-hidden />
        </span>
        <h2 className="mt-8 text-2xl font-bold text-ink">{t("announcements.successTitle")}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{done.live ? t("announcements.successLive") : t("announcements.successScheduled")}</p>

        <div className="mt-6 rounded-card border border-line bg-surface-soft p-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <p className={labelCls}>{t("announcements.announcementWord")}</p>
            <span className="rounded-pill bg-success-soft px-4 py-1 text-[10px] font-bold tracking-wide text-primary uppercase">{done.live ? t("announcements.live") : t("announcements.scheduledPill")}</span>
          </div>
          <p className="mt-3 text-[17px] font-bold text-ink">{done.title}</p>
          <p className="mt-2 text-xs text-muted">{done.type}</p>
        </div>

        {done.names.length > 0 && (
          <div className="mt-4 rounded-card border border-line bg-surface p-5 text-left">
            <p className="text-xs font-bold text-ink">{t("announcements.publishedTo")}</p>
            <p className="mt-3 text-xl font-bold text-primary">{t("announcements.nGp", { n: done.names.length })}</p>
            <p className="mt-1 text-xs text-muted">{done.names.slice(0, 6).join(" • ")}{done.names.length > 6 ? ` • +${done.names.length - 6}` : ""}</p>
            <hr className="my-3 border-line" />
            <p className="text-xs text-muted">
              <span className="mr-4 font-semibold">{t("announcements.visibleOn")}</span>
              <span className="text-ink">{done.pages.join(" • ")}</span>
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setPicked(new Set());
              setFormError(null);
              reset();
            }}
            className="h-12 rounded-button border border-primary bg-surface text-sm font-bold text-primary hover:bg-surface-soft"
          >
            {t("announcements.publishAnother")}
          </button>
          <Link href={`/admin/announcements/${done.id}`} className="inline-flex h-12 items-center justify-center rounded-button bg-primary text-sm font-bold text-white hover:bg-primary-hover">
            {t("announcements.viewAnnouncement")}
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted">{t("announcements.editLater")}</p>
      </section>
    );
  }

  const showEn = language !== "mr";
  const showMr = language !== "en";
  const toggleGroup = (id: string) => setOpenGroups((s) => new Set(s.has(id) ? [...s].filter((x) => x !== id) : [...s, id]));
  const togglePick = (id: string) => setPicked((s) => new Set(s.has(id) ? [...s].filter((x) => x !== id) : [...s, id]));
  const allPicked = gps.length > 0 && gps.every((g) => picked.has(g.id));
  const publishLabel = shared ? t("announcements.publishToN", { n: picked.size }) : t("announcements.publishNow");

  return (
    <form onSubmit={handleSubmit((v) => onSubmit(v, editing ? "draft" : "publish"))} noValidate className="rounded-card border border-line bg-surface">
      {!editing && (
        <div className="border-b border-line px-6 py-5">
          <h2 className="text-xl font-bold text-ink">{t("announcements.publishTitle")}</h2>
          <p className="mt-0.5 text-xs text-muted">{t("announcements.publishSubtitle")}</p>
        </div>
      )}

      <div className="grid gap-4 px-6 py-5">
        {!shared && !editing && (
          <Controller
            control={control}
            name="tenantId"
            render={({ field }) => <TenantSelect label={t("announcements.tenant")} value={field.value} onChange={(id) => field.onChange(id)} error={formState.errors.tenantId?.message} />}
          />
        )}

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
          <Select label={t("announcements.type.label")} placeholder={t("announcements.type.select")} options={typeOptions} error={formState.errors.category?.message} {...register("category")} />
          <Select label={t("announcements.priority")} options={PRIORITIES.map((p) => ({ value: p, label: t(`announcements.priorityLabel.${p}`) }))} {...register("priority")} />
          <Input label={t("announcements.publishDate")} type="datetime-local" hint={t("announcements.publishImmediately")} {...register("publishAt")} />
        </div>

        {showEn && <Input label={showMr ? `${t("announcements.announcementTitle")} (${tc("english")})` : t("announcements.announcementTitle")} placeholder={t("announcements.enterTitle")} error={formState.errors.titleEn?.message} {...register("titleEn")} />}
        {showMr && <Input label={showEn ? `${t("announcements.announcementTitle")} (${tc("marathi")})` : t("announcements.announcementTitle")} lang="mr" placeholder={t("announcements.enterTitle")} error={formState.errors.titleMr?.message} {...register("titleMr")} />}
        {showEn && <Textarea label={showMr ? `${t("announcements.announcementContent")} (${tc("english")})` : t("announcements.announcementContent")} rows={5} placeholder={t("announcements.enterContent")} error={formState.errors.bodyEn?.message} {...register("bodyEn")} />}
        {showMr && <Textarea label={showEn ? `${t("announcements.announcementContent")} (${tc("marathi")})` : t("announcements.announcementContent")} lang="mr" rows={5} placeholder={t("announcements.enterContent")} error={formState.errors.bodyMr?.message} {...register("bodyMr")} />}

        <div className="grid items-start gap-4 md:grid-cols-[1fr_1fr_1.2fr]">
          <div className="rounded-card border border-line-strong bg-surface-select p-3">
            <Controller
              control={control}
              name="attachmentId"
              render={({ field }) => <AttachmentField label={t("announcements.attachPdf")} value={field.value} onChange={field.onChange} scope={attachmentScope} error={formState.errors.attachmentId?.message} />}
            />
          </div>
          <Select
            label={t("announcements.language")}
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            options={[
              { value: "both", label: t("announcements.langBoth") },
              { value: "en", label: tc("english") },
              { value: "mr", label: tc("marathi") },
            ]}
          />
          <Controller
            control={control}
            name="displayPages"
            render={({ field }) => (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none flex-col gap-1.5 [&::-webkit-details-marker]:hidden">
                  <span className={labelCls}>{t("announcements.displayOnPages")}</span>
                  <span className="flex h-11 items-center justify-between rounded-card border border-line-strong bg-surface-select px-3 text-sm text-ink">
                    {field.value.length === 0
                      ? t("announcements.choosePages")
                      : field.value.length === 1
                        ? t(`pageNames.${field.value[0]}`)
                        : t("announcements.pagesSummary", { first: t(`pageNames.${field.value[0]}`), n: field.value.length - 1 })}
                    <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </span>
                </summary>
                <ul className="absolute z-10 mt-1 grid max-h-64 w-full gap-1 overflow-y-auto rounded-card border border-line bg-surface p-3 shadow-lg">
                  {PAGE_KEYS.map((key) => (
                    <li key={key}>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" className="size-4 accent-primary" checked={field.value.includes(key)} onChange={(e) => field.onChange(e.target.checked ? [...field.value, key] : field.value.filter((k) => k !== key))} />
                        {t(`pageNames.${key}`)}
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          />
        </div>
        {formState.errors.displayPages && (
          <p role="alert" className="text-xs text-danger">
            {formState.errors.displayPages.message}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <Input label={`${t("announcements.expiresAt")} (${tc("optional")})`} type="datetime-local" {...register("expiresAt")} />
        </div>

        {shared && (
          <section className="rounded-card border border-line p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div className="flex items-start gap-3">
                <Diamond className="mt-1 size-4 text-primary" aria-hidden />
                <div>
                  <h3 className="text-[15px] font-bold text-ink">{t("announcements.selectTargets")}</h3>
                  <p className="text-xs text-muted">{t("announcements.selectTargetsHint")}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={allPicked}
                  onChange={(e) => {
                    setPicked(e.target.checked ? new Set(gps.map((g) => g.id)) : new Set());
                    setOpenGroups(new Set(groups.map((g) => g.id)));
                  }}
                />
                {t("announcements.allCreated")}
              </label>
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="grid gap-4">
                {groups.length > 1 && (
                  <div>
                    <p className={cn(labelCls, "mb-2")}>{t("announcements.talukasBlocks")}</p>
                    <div className="flex flex-wrap gap-2">
                      {groups.map((g) => {
                        const on = openGroups.has(g.id);
                        return (
                          <button key={g.id} type="button" aria-pressed={on} onClick={() => toggleGroup(g.id)} className={cn(chipBase, on ? "border-primary bg-success-soft text-primary" : "border-line-strong bg-surface text-muted hover:bg-surface-soft")}>
                            {on && <Check className="size-3.5" aria-hidden />}
                            {name(g)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <p className={cn(labelCls, "mb-2")}>{t("announcements.gpWebsites")}</p>
                  {visibleGps.length === 0 ? (
                    <p className="text-xs text-muted">{gps.length === 0 ? t("announcements.noWebsites") : t("announcements.pickAreaFirst")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {visibleGps.map((g) => {
                        const on = picked.has(g.id);
                        return (
                          <button key={g.id} type="button" aria-pressed={on} onClick={() => togglePick(g.id)} className={cn(chipBase, "min-w-[120px]", on ? "border-primary bg-success-soft text-primary" : "border-line-strong bg-surface text-muted hover:bg-surface-soft")}>
                            {on && <Check className="size-3.5" aria-hidden />}
                            {name(g)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="self-start rounded-card bg-surface-soft p-5">
                <p className={labelCls}>{t("announcements.selectedTargets")}</p>
                <p className="mt-3 text-xl font-bold text-primary">{t("announcements.nGp", { n: picked.size })}</p>
                <p className="mt-1 text-xs text-muted">{t("announcements.acrossAreas", { n: areasPicked, area: targets?.ownerNameEn ?? "" })}</p>
                <button type="button" onClick={() => setShowSelected((v) => !v)} className="mt-4 text-xs font-bold text-primary hover:underline">
                  {t("announcements.viewAllSelected")} →
                </button>
              </aside>
            </div>
            {showSelected && (
              <p className="mt-4 rounded-input bg-surface-soft px-4 py-3 text-xs text-ink">{pickedGps.length ? pickedGps.map(name).join(" • ") : t("announcements.noneSelected")}</p>
            )}
            {targetError && (
              <p role="alert" className="mt-3 text-xs text-danger">
                {t("announcements.pickOne")}
              </p>
            )}
          </section>
        )}

        {formError && (
          <p role="alert" className="rounded-input bg-danger-soft px-4 py-3 text-sm text-danger">
            {formError}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4">
        <p className="max-w-md text-xs text-muted">{t("announcements.footNote")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={existing ? `/admin/announcements/${existing.id}` : "/admin/announcements"} className="inline-flex h-11 items-center rounded-button border border-line-strong bg-surface px-8 text-sm font-semibold text-ink hover:bg-surface-soft">
            {tc("cancel")}
          </Link>
          {!editing && (
            <button
              type="button"
              disabled={formState.isSubmitting}
              onClick={handleSubmit((v) => onSubmit(v, "draft"))}
              className="inline-flex h-11 items-center rounded-button border border-primary bg-surface px-7 text-sm font-semibold text-primary hover:bg-surface-soft disabled:opacity-60"
            >
              {t("announcements.saveDraft")}
            </button>
          )}
          <Button type="submit" loading={formState.isSubmitting} className="h-11">
            {editing ? tc("save") : publishLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
