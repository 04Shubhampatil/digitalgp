import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Table-cell size (40px high); `label` then becomes the accessible name only. */
  compact?: boolean;
}

/** Labelled text input matching the Figma login/admin fields (52px, 8px radius, #d6e0d9 border). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leading, trailing, compact, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className={cn("text-[11px] font-semibold uppercase tracking-wide text-muted", compact && "sr-only")}>
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex items-center gap-2 rounded-input border bg-surface transition-colors",
          compact ? "h-10 px-3" : "h-13 px-4",
          "focus-within:border-primary",
          error ? "border-danger" : "border-line",
        )}
      >
        {leading && <span className="shrink-0 text-muted">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-full w-full min-w-0 bg-transparent text-ink-strong outline-none placeholder:text-placeholder",
            compact ? "text-[13px]" : "text-[15px]",
            className,
          )}
          {...rest}
        />
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
