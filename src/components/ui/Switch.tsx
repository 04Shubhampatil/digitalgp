import { cn } from "@/lib/cn";

/** On/off switch (Figma toggle). `label` is shown beside it, or only announced when `hideLabel` is set. */
export function Switch({ checked, onChange, disabled, label, hideLabel }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string; hideLabel?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-ink">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-primary" : "bg-track")}
      >
        <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform", checked && "translate-x-5")} />
      </button>
      {!hideLabel && label}
    </label>
  );
}
