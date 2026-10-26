import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-card border border-line bg-surface", className)}>{children}</section>;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3", className)}>
      <div>
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export type MetricTone = "info" | "success" | "warning" | "danger" | "violet";
const dot: Record<MetricTone, string> = {
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  violet: "bg-violet",
};

/** Figma metric card: label + coloured dot, big value, optional caption. */
export function MetricCard({
  label,
  value,
  caption,
  tone = "info",
}: {
  label: string;
  value: ReactNode;
  caption?: string;
  tone?: MetricTone;
}) {
  return (
    <div className="flex min-h-[110px] flex-col justify-between rounded-card border border-line bg-surface px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span aria-hidden className={cn("size-2.5 rounded-full", dot[tone])} />
      </div>
      <p className="text-[27px] leading-none font-bold text-ink">{value}</p>
      {caption && <p className="mt-1 text-[11px] text-muted">{caption}</p>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-[25px] leading-tight font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
