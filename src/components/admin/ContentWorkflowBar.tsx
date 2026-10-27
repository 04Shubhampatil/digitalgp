"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ContentStatus } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";
import { announcements, availableActions, projects, schemes, type WorkflowAction } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

export type WorkflowResourceKind = "announcements" | "schemes" | "projects";
const RESOURCES = { announcements, schemes, projects } as const;
const DESTRUCTIVE: WorkflowAction[] = ["reject", "archive", "unpublish"];

/**
 * Review/publish actions for announcements, schemes and projects (POST /<resource>/:id/:action).
 * Buttons come from the workflow table + the user's capabilities; the server re-validates.
 */
export function ContentWorkflowBar({
  resource,
  id,
  status,
  capabilities,
  canDelete,
  listPath,
}: {
  resource: WorkflowResourceKind;
  id: string;
  status: ContentStatus;
  capabilities: string[];
  canDelete: boolean;
  listPath: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<WorkflowAction | null>(null);
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const api = RESOURCES[resource];
  const actions = availableActions(status, capabilities);

  const run = (action: WorkflowAction, withNote?: string) =>
    start(async () => {
      setError(null);
      try {
        await api.transition(id, action, withNote ?? null);
        setNoteFor(null);
        setNote("");
        router.refresh();
      } catch (err) {
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  const remove = () =>
    start(async () => {
      try {
        await api.remove(id);
        router.push(listPath);
        router.refresh();
      } catch (err) {
        setConfirmDelete(false);
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <Button
          key={a}
          size="sm"
          variant={a === "publish" || a === "approve" || a === "submit" ? "primary" : DESTRUCTIVE.includes(a) ? "danger" : "secondary"}
          loading={pending}
          onClick={() => (a === "reject" ? setNoteFor(a) : run(a))}
        >
          {t(`announcements.action.${a}`)}
        </Button>
      ))}
      {canDelete && status !== "PUBLISHED" && (
        <Button size="sm" variant="ghost" loading={pending} onClick={() => setConfirmDelete(true)}>
          {tc("delete")}
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
      <Dialog
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        title={t("announcements.action.reject")}
        closeLabel={tc("close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteFor(null)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} disabled={!note.trim()} onClick={() => noteFor && run(noteFor, note.trim())}>
              {t("announcements.action.reject")}
            </Button>
          </>
        }
      >
        <Textarea label={t("announcements.rejectNote")} value={note} onChange={(e) => setNote(e.target.value)} rows={4} required />
      </Dialog>
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={tc("delete")}
        closeLabel={tc("close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              {tc("cancel")}
            </Button>
            <Button variant="danger" loading={pending} onClick={remove}>
              {tc("delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{t("deleteConfirm")}</p>
      </Dialog>
    </div>
  );
}
