import { Search } from "lucide-react";
import type { ReactNode } from "react";

/**
 * GET form that writes filters to the URL (server-rendered lists re-fetch on navigation).
 * Children are native inputs/selects whose `name` becomes a query param.
 */
export function FilterBar({
  action,
  children,
  applyLabel,
  searchName = "q",
  searchPlaceholder,
  searchValue,
}: {
  action: string;
  children?: ReactNode;
  applyLabel: string;
  searchName?: string;
  searchPlaceholder?: string;
  searchValue?: string;
}) {
  return (
    <form action={action} method="get" className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface px-5 py-4">
      {searchPlaceholder !== undefined && (
        <label className="relative flex-1 basis-56">
          <span className="sr-only">{searchPlaceholder}</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            name={searchName}
            defaultValue={searchValue}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-card border border-line-strong bg-surface pr-3 pl-9 text-sm outline-none placeholder:text-placeholder focus:border-primary"
          />
        </label>
      )}
      {children}
      <button type="submit" className="h-11 rounded-button bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
        {applyLabel}
      </button>
    </form>
  );
}

/** Native select for FilterBar (uncontrolled, submits with the form). */
export function FilterSelect({
  name,
  label,
  value,
  options,
  allLabel,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <label className="flex min-w-40 flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-11 rounded-card border border-line-strong bg-surface-select px-3 text-sm text-ink outline-none focus:border-primary"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
