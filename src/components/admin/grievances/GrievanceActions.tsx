"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { GrievanceDto, UserDto } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { GRIEVANCE_NEXT, grievances, users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

type Next = "IN_PROGRESS" | "RESOLVED" | "REJECTED";

/** Assign (POST /grievances/:id/assign) and move status (POST /grievances/:id/status) — `grievance:manage`. */
export function GrievanceActions({ grievance, canManage }: { grievance: GrievanceDto; canManage: boolean }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<UserDto[]>([]);
  const [noteFor, setNoteFor] = useState<Next | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    users
      .list({ status: "ACTIVE", limit: 100 })
      .then((p) => !cancelled && setStaff(p.data))
      .catch(() => !cancelled && setStaff([]));
    return () => {
      cancelled = true;
    };
  }, [canManage]);

  if (!canManage) return null;

  const assign = (assignedToId: string) =>
    start(async () => {
      setError(null);
      try {
        await grievances.assign(grievance.id, assignedToId || null);
        router.refresh();
      } catch (err) {
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  const move = (status: Next, withNote?: string) =>
    start(async () => {
      setError(null);
      try {
        await grievances.setStatus(grievance.id, status, withNote ?? null);
        setNoteFor(null);
        setNote("");
        router.refresh();
      } catch (err) {
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  const next = GRIEVANCE_NEXT[grievance.status];

  return (
    <div className="grid gap-4">
      <Select
        label={t("grievancesUi.assignee")}
        value={grievance.assignedToId ?? ""}
        placeholder={t("grievancesUi.unassigned")}
        disabled={pending}
        onChange={(e) => assign(e.target.value)}
        options={staff.map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` }))}
      />
      <div className="flex flex-wrap items-center gap-2">
        {next.map((s) => (
          <Button key={s} size="sm" variant={s === "RESOLVED" ? "primary" : s === "REJECTED" ? "danger" : "secondary"} loading={pending} onClick={() => (s === "IN_PROGRESS" ? move(s) : setNoteFor(s))}>
            {t(`grievancesUi.moveTo.${s}`)}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Dialog
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        title={noteFor ? t(`grievancesUi.moveTo.${noteFor}`) : ""}
        description={t("grievancesUi.noteHint")}
        closeLabel={tc("close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteFor(null)}>
              {tc("cancel")}
            </Button>
            <Button variant={noteFor === "REJECTED" ? "danger" : "primary"} loading={pending} disabled={!note.trim()} onClick={() => noteFor && move(noteFor, note.trim())}>
              {tc("confirm")}
            </Button>
          </>
        }
      >
        <Textarea label={t("grievancesUi.resolutionNote")} value={note} onChange={(e) => setNote(e.target.value)} rows={4} required />
      </Dialog>
    </div>
  );
}
