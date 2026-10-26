import type { AnnouncementPriority, ContentStatus, GrievanceStatus, TenantStatus } from "@/types/api";
import { cn } from "@/lib/cn";

type Tone = "success" | "warning" | "danger" | "info" | "violet" | "neutral";

const tones: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  neutral: "bg-track text-muted",
};

export type PillStatus = ContentStatus | TenantStatus | AnnouncementPriority | GrievanceStatus | "NOT_CREATED";

/** Tone per backend status value (src/types/api.ts) — Figma colours from the inspection summary. */
export const STATUS_TONE: Record<PillStatus, Tone> = {
  DRAFT: "warning",
  SUBMITTED: "info",
  UNDER_REVIEW: "info",
  APPROVED: "violet",
  PUBLISHED: "success",
  REJECTED: "danger",
  ARCHIVED: "neutral",
  SUSPENDED: "danger",
  NOT_CREATED: "danger",
  NORMAL: "success",
  IMPORTANT: "info",
  URGENT: "warning",
  EMERGENCY: "danger",
  OPEN: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
};

export interface StatusPillProps {
  status: PillStatus;
  /** Localised label; defaults to a title-cased version of the status key. */
  label?: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const text = label ?? status.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span
      className={cn(
        "inline-flex h-[26px] items-center rounded-pill px-3 text-[11px] font-semibold whitespace-nowrap",
        tones[STATUS_TONE[status]],
        className,
      )}
    >
      {text}
    </span>
  );
}
