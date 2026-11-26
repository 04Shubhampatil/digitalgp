"use client";

import { Copy, KeyRound, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { users } from "@/lib/api/admin";
import { isApiError } from "@/lib/api/client";

/**
 * Reset password (new temporary password, shown once) and delete account. Both end the user's sessions.
 * Shown only to managers, never on one's own profile; the server re-checks scope and role for each call.
 */
export function UserAccountActions({ userId, userName }: { userId: string; userName: string }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"reset" | "delete" | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      setError(null);
      try {
        if (confirm === "reset") {
          const res = await users.resetPassword(userId);
          setConfirm(null);
          setTempPassword(res.temporaryPassword);
          router.refresh();
        } else if (confirm === "delete") {
          await users.remove(userId);
          setConfirm(null);
          router.push("/admin/users?role=all");
          router.refresh();
        }
      } catch (err) {
        setConfirm(null);
        setError(isApiError(err) ? err.message : tc("errorGeneric"));
      }
    });

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => setConfirm("reset")}>
          <KeyRound className="size-4" aria-hidden /> {t("usersUi.resetPassword")}
        </Button>
        <Button variant="danger" onClick={() => setConfirm("delete")}>
          <Trash2 className="size-4" aria-hidden /> {t("usersUi.deleteUser")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "delete" ? t("usersUi.deleteUser") : t("usersUi.resetPassword")}
        closeLabel={tc("close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {tc("cancel")}
            </Button>
            <Button variant={confirm === "delete" ? "danger" : "primary"} loading={pending} onClick={run}>
              {confirm === "delete" ? t("usersUi.deleteUser") : t("usersUi.resetPassword")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink">{confirm === "delete" ? t("usersUi.deleteConfirm", { name: userName }) : t("usersUi.resetConfirm", { name: userName })}</p>
      </Dialog>

      <Dialog
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title={t("usersUi.resetDone")}
        closeLabel={tc("close")}
        size="sm"
        footer={<Button onClick={() => setTempPassword(null)}>{tc("confirm")}</Button>}
      >
        <p className="text-sm font-semibold text-ink">{t("users.tempPasswordTitle")}</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-input border border-line bg-surface-table px-3 py-2 font-mono text-sm break-all">{tempPassword}</code>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(tempPassword ?? "");
              setCopied(true);
            }}
          >
            <Copy className="size-4" aria-hidden /> {copied ? tc("saved") : "Copy"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">{t("users.tempPasswordHint")}</p>
      </Dialog>
    </div>
  );
}
